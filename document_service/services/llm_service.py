"""
LLM智能分析服务 - 支持分阶段、分商家类型的智能表单填写
"""

import json
import time
from typing import Dict, Any, List
from loguru import logger
import openai
from config.settings import LLM_CONFIG

class LLMService:
    """LLM智能分析服务类"""

    def __init__(self):
        """初始化LLM客户端"""
        try:
            self.client = openai.OpenAI(
                api_key=LLM_CONFIG["api_key"],
                base_url=LLM_CONFIG["base_url"]
            )
            self.model = LLM_CONFIG["model"]
            self.temperature = LLM_CONFIG["temperature"]
            self.max_tokens = LLM_CONFIG["max_tokens"]

            # 商家类型映射
            self.merchant_type_names = {
                "factory": "生产工厂",
                "brand": "品牌商",
                "agent": "代理商",
                "dealer": "经销商",
                "operator": "代运营商"
            }

            logger.info(f"LLM客户端初始化成功 - 模型: {self.model}, 服务地址: {LLM_CONFIG['base_url']}")
        except Exception as e:
            logger.error(f"LLM客户端初始化失败: {e}")
            raise
    
    async def analyze_basic_info(self, content: str, current_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        分析基础信息阶段 - 提取公司基本信息

        Args:
            content: 文档文本内容
            current_data: 当前已填写的数据

        Returns:
            分析结果字典
        """
        try:
            start_time = time.time()

            # 构建基础信息提示词
            prompt = self._build_basic_info_prompt(content, current_data)

            # 调用LLM
            response = await self._call_llm(prompt)

            # 解析响应
            suggestions = self._parse_basic_info_response(response)

            processing_time = time.time() - start_time

            return {
                "success": True,
                "suggestions": suggestions,
                "processing_time": processing_time,
                "overall_confidence": self._calculate_overall_confidence(suggestions),
                "stage": "basic_info"
            }

        except Exception as e:
            logger.error(f"基础信息分析失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "suggestions": [],
                "stage": "basic_info"
            }

    async def analyze_detailed_info(self, content: str, merchant_type: str, current_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        分析详细信息阶段 - 根据商家类型提取特定字段

        Args:
            content: 文档文本内容
            merchant_type: 商家类型
            current_data: 当前已填写的数据

        Returns:
            分析结果字典
        """
        try:
            start_time = time.time()

            # 构建详细信息提示词
            prompt = self._build_detailed_info_prompt(content, merchant_type, current_data)

            # 调用LLM
            response = await self._call_llm(prompt)

            # 解析响应
            suggestions = self._parse_detailed_info_response(response, merchant_type)

            processing_time = time.time() - start_time

            return {
                "success": True,
                "suggestions": suggestions,
                "processing_time": processing_time,
                "overall_confidence": self._calculate_overall_confidence(suggestions),
                "stage": "detailed_info",
                "merchant_type": merchant_type
            }

        except Exception as e:
            logger.error(f"详细信息分析失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "suggestions": [],
                "stage": "detailed_info",
                "merchant_type": merchant_type
            }

    async def analyze_document(self, content: str, merchant_type: str, structured_content: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        兼容性方法 - 保持向后兼容
        """
        logger.warning("使用了废弃的analyze_document方法，建议使用analyze_basic_info或analyze_detailed_info")
        return await self.analyze_detailed_info(content, merchant_type, structured_content)
    
    def _build_basic_info_prompt(self, content: str, current_data: Dict[str, Any] = None) -> str:
        """构建基础信息阶段的提示词"""

        current_info = ""
        if current_data:
            current_info = f"\n当前已填写的信息：\n{json.dumps(current_data, ensure_ascii=False, indent=2)}\n"

        prompt = f"""你是一个专业的商家申请信息提取助手。请从以下文档内容中提取商家的基础信息。

文档内容：
{content[:3000]}
{current_info}
请提取以下基础字段信息，并以JSON格式返回。如果某个字段在文档中找不到，请设置为null：

{{
    "company_name": "公司全称（营业执照上的名称）",
    "contact_name": "联系人姓名",
    "contact_phone": "联系电话（手机号）",
    "contact_email": "联系邮箱",
    "product_category": "产品品类（从以下选择：3C数码家电、本地生活、宠物生活、服饰箱包、个护家清、家居百货、礼品文创、运动户外、家装家具、酒水、美妆、母婴童装、汽摩生活、生鲜、食品饮料、手表配饰、图书教育、玩具乐器、虚拟充值、珠宝文玩、滋补保健、其它）",
    "specific_products": "具体产品描述",
    "cooperation_requirements": "和遥望合作诉求（描述合作需求）",
    "industry_operator_contact": "对接行业运营花名（没有填无）"
}}

提取要求：
1. 公司名称必须是完整的企业名称
2. 联系电话优先提取手机号码
3. 产品品类必须从给定选项中选择最匹配的
4. 如果文档中没有明确信息，设置为null
5. 返回格式必须是有效的JSON

请返回提取结果："""

        return prompt

    def _build_detailed_info_prompt(self, content: str, merchant_type: str, current_data: Dict[str, Any] = None) -> str:
        """构建详细信息阶段的提示词"""

        merchant_type_name = self.merchant_type_names.get(merchant_type, merchant_type)

        current_info = ""
        if current_data:
            current_info = f"\n当前已填写的信息：\n{json.dumps(current_data, ensure_ascii=False, indent=2)}\n"

        base_prompt = f"""你是一个专业的商家申请信息提取助手。请从以下文档内容中提取{merchant_type_name}的详细信息。

商家类型：{merchant_type_name}

文档内容：
{content[:3000]}
{current_info}"""

        # 根据商家类型构建不同的提示词
        if merchant_type == "factory":
            return self._build_factory_prompt(base_prompt)
        elif merchant_type == "brand":
            return self._build_brand_prompt(base_prompt)
        elif merchant_type == "agent":
            return self._build_agent_prompt(base_prompt)
        elif merchant_type == "dealer":
            return self._build_dealer_prompt(base_prompt)
        elif merchant_type == "operator":
            return self._build_operator_prompt(base_prompt)
        else:
            return self._build_generic_prompt(base_prompt)

    def _build_factory_prompt(self, base_prompt: str) -> str:
        """构建工厂类型的详细提示词"""
        return base_prompt + """

请提取以下工厂特有字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "specific_products": "具体产品",
    "own_brand": "自有品牌（没有填无，有就填写具体品牌名称）",
    "own_brand_operation_ability": "自有品牌运营能力（没有填无，指店铺运营、客服、物流等能力）",
    "oem_famous_brands": "代工的知名品牌（填写具体品牌名称）",
    "annual_production_capacity": "年生产规模（产能优势，最大产出能力）",
    "need_mold_or_repackage": "是否需要开模或改包装（是/否/未确认）",
    "estimated_mold_time": "预计开模/改包装时间（示例：x天、x个月）",
    "accept_brand_cocreation": "是否接受品牌共创（是/否，品牌属于遥望或遥望合资公司）",
    "accept_deep_cooperation": "是否接受深度合作（是/否）",
    "accept_online_exclusive": "是否接受线上/全渠道独家（是/否）",
    "accept_yaowang_authorization": "是否接受遥望授权其他渠道（是/否）",
    "accept_omnichannel_dividend": "是否接受后续全渠道分红（是/否）"
}

提取要求：
1. 重点关注生产能力、代工经验、合作意愿
2. 对于是/否问题，尽量从文档中推断态度
3. 如果文档中没有明确信息，设置为null
4. 返回格式必须是有效的JSON

请返回提取结果："""

    def _build_brand_prompt(self, base_prompt: str) -> str:
        """构建品牌商类型的详细提示词"""
        return base_prompt + """

请提取以下品牌商特有字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "brand_name": "品牌名称（填写具体品牌名称）",
    "brand_popularity": "品牌知名度（可上传第三方平台店铺首页截图）",
    "sales_data": "销售数据（线上销售、店铺自播、线下商超销售数据）",
    "cooperation_budget": "合作预算（日常销售或营销预算投入）"
}

提取要求：
1. 重点关注品牌影响力、销售表现、营销投入
2. 销售数据要具体，包含平台、金额、时间等
3. 如果文档中没有明确信息，设置为null
4. 返回格式必须是有效的JSON

请返回提取结果："""

    def _build_agent_prompt(self, base_prompt: str) -> str:
        """构建代理商类型的详细提示词"""
        return base_prompt + """

请提取以下代理商特有字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "agent_brand_name": "代理的品牌名称（没有填无，有就填写代理品牌名称）",
    "brand_popularity": "品牌知名度（可上传第三方平台店铺首页截图）",
    "sales_data": "销售数据（线上销售、历史合作主播、线下商超销售数据）",
    "cooperation_budget": "合作预算（日常销售或营销预算投入）"
}

提取要求：
1. 重点关注代理品牌实力、渠道能力、合作经验
2. 销售数据要体现代理能力和市场表现
3. 如果文档中没有明确信息，设置为null
4. 返回格式必须是有效的JSON

请返回提取结果："""

    def _build_dealer_prompt(self, base_prompt: str) -> str:
        """构建经销商类型的详细提示词"""
        return base_prompt + """

请提取以下经销商特有字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "dealer_brand_name": "经销的品牌名称（没有填无，有就填写经销品牌名称）",
    "brand_popularity": "品牌知名度（可上传第三方平台店铺首页截图）",
    "sales_data": "销售数据（线上销售、历史合作主播、线下商超销售数据）",
    "cooperation_budget": "合作预算（日常销售或营销预算投入）"
}

提取要求：
1. 重点关注经销品牌、分销网络、销售能力
2. 销售数据要体现经销实力和市场覆盖
3. 如果文档中没有明确信息，设置为null
4. 返回格式必须是有效的JSON

请返回提取结果："""

    def _build_operator_prompt(self, base_prompt: str) -> str:
        """构建代运营商类型的详细提示词"""
        return base_prompt + """

请提取以下代运营商特有字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "operator_brand_name": "代运营的品牌名称（填写代运营的品牌名称）",
    "brand_popularity": "品牌知名度（可上传第三方平台店铺首页截图）",
    "sales_data": "销售数据（线上销售、店铺自播、线下商超销售数据）",
    "cooperation_budget": "合作预算（近期日常销售或营销预算可投入的具体金额）"
}

提取要求：
1. 重点关注运营能力、服务品牌、运营成果
2. 销售数据要体现运营效果和专业水平
3. 合作预算要具体到金额
4. 如果文档中没有明确信息，设置为null
5. 返回格式必须是有效的JSON

请返回提取结果："""

    def _build_generic_prompt(self, base_prompt: str) -> str:
        """构建通用类型的详细提示词"""
        return base_prompt + """

请提取以下通用字段信息，并以JSON格式返回：

{
    "company_description": "公司简介",
    "business_scope": "经营范围",
    "cooperation_budget": "合作预算"
}

提取要求：
1. 如果文档中没有明确信息，设置为null
2. 返回格式必须是有效的JSON

请返回提取结果："""

    async def _call_llm(self, prompt: str) -> str:
        """调用LLM API"""
        try:
            logger.info(f"调用本地LLM模型: {self.model}")
            logger.info(f"服务地址: {self.client.base_url}")
            logger.info(f"提示词长度: {len(prompt)} 字符")

            # 打印完整的提示词
            print(f"\n🤖 LLM输入提示词:")
            print("=" * 80)
            print(prompt)
            print("=" * 80)

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的文档信息提取助手，擅长从各种商业文档中准确提取结构化信息。请严格按照JSON格式返回结果。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=False
            )

            result = response.choices[0].message.content
            logger.info(f"LLM响应长度: {len(result)} 字符")

            # 打印完整的LLM响应
            print(f"\n🤖 LLM原始响应:")
            print("=" * 80)
            print(result)
            print("=" * 80)

            return result

        except Exception as e:
            logger.error(f"LLM API调用失败: {e}")
            logger.error(f"模型: {self.model}, 服务地址: {self.client.base_url}")
            raise
    
    def _parse_basic_info_response(self, response: str) -> List[Dict[str, Any]]:
        """解析基础信息阶段的LLM响应"""
        try:
            data = self._extract_json_from_response(response)
            if not data:
                return []

            # 基础信息字段映射和验证
            basic_fields = {
                "company_name": {"required": True, "type": "text"},
                "contact_name": {"required": True, "type": "text"},
                "contact_phone": {"required": True, "type": "phone"},
                "contact_email": {"required": False, "type": "email"},
                "product_category": {"required": True, "type": "select"},
                "specific_products": {"required": True, "type": "text"},
                "cooperation_requirements": {"required": False, "type": "textarea"},
                "industry_operator_contact": {"required": False, "type": "text"}
            }

            suggestions = []
            for field_name, field_config in basic_fields.items():
                if field_name in data and data[field_name] is not None and data[field_name] != "":
                    value = data[field_name]
                    confidence = self._calculate_field_confidence(field_name, value, field_config)

                    suggestions.append({
                        "field_name": field_name,
                        "suggested_value": str(value),
                        "confidence": confidence,
                        "source": "llm",
                        "stage": "basic_info"
                    })

            logger.info(f"基础信息解析完成，提取了 {len(suggestions)} 个字段")

            # 打印解析结果
            print(f"\n📋 基础信息解析结果:")
            print("=" * 60)
            for suggestion in suggestions:
                print(f"  {suggestion['field_name']}: {suggestion['suggested_value']} (置信度: {suggestion['confidence']:.2f})")
            print("=" * 60)

            return suggestions

        except Exception as e:
            logger.error(f"基础信息响应解析失败: {e}")
            return []

    def _parse_detailed_info_response(self, response: str, merchant_type: str) -> List[Dict[str, Any]]:
        """解析详细信息阶段的LLM响应"""
        try:
            data = self._extract_json_from_response(response)
            if not data:
                return []

            # 获取商家类型特定字段配置
            detailed_fields = self._get_merchant_type_fields(merchant_type)

            suggestions = []
            for field_name, field_config in detailed_fields.items():
                if field_name in data and data[field_name] is not None and data[field_name] != "":
                    value = data[field_name]
                    confidence = self._calculate_field_confidence(field_name, value, field_config)

                    suggestions.append({
                        "field_name": field_name,
                        "suggested_value": str(value),
                        "confidence": confidence,
                        "source": "llm",
                        "stage": "detailed_info",
                        "merchant_type": merchant_type
                    })

            logger.info(f"详细信息解析完成，提取了 {len(suggestions)} 个字段")

            # 打印解析结果
            print(f"\n📋 详细信息解析结果 ({merchant_type}):")
            print("=" * 60)
            for suggestion in suggestions:
                print(f"  {suggestion['field_name']}: {suggestion['suggested_value']} (置信度: {suggestion['confidence']:.2f})")
            print("=" * 60)

            return suggestions

        except Exception as e:
            logger.error(f"详细信息响应解析失败: {e}")
            return []

    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """从LLM响应中提取JSON数据"""
        try:
            response_clean = response.strip()

            # 查找JSON代码块
            if "```json" in response_clean:
                start = response_clean.find("```json") + 7
                end = response_clean.find("```", start)
                if end != -1:
                    response_clean = response_clean[start:end].strip()
            elif "{" in response_clean and "}" in response_clean:
                # 提取所有完整的JSON对象，选择最大的一个（通常是最完整的结果）
                json_objects = []
                i = 0
                while i < len(response_clean):
                    start = response_clean.find("{", i)
                    if start == -1:
                        break

                    brace_count = 0
                    end = start
                    for j, char in enumerate(response_clean[start:], start):
                        if char == "{":
                            brace_count += 1
                        elif char == "}":
                            brace_count -= 1
                            if brace_count == 0:
                                end = j + 1
                                break

                    if brace_count == 0:  # 找到完整的JSON对象
                        json_str = response_clean[start:end]
                        try:
                            json_obj = json.loads(json_str)
                            json_objects.append((json_str, json_obj, len(json_str)))
                        except json.JSONDecodeError:
                            pass  # 忽略无效的JSON

                    i = start + 1

                # 选择最长的JSON对象（通常是最完整的结果）
                if json_objects:
                    json_objects.sort(key=lambda x: x[2], reverse=True)  # 按长度排序
                    response_clean = json_objects[0][0]
                    logger.info(f"找到 {len(json_objects)} 个JSON对象，选择最长的一个")
                else:
                    logger.warning("未找到有效的JSON对象")
                    return {}

            logger.info(f"清理后的JSON: {response_clean[:200]}...")
            return json.loads(response_clean)

        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.error(f"原始响应: {response}")
            return {}
        except Exception as e:
            logger.error(f"JSON提取失败: {e}")
            return {}

    def _get_merchant_type_fields(self, merchant_type: str) -> Dict[str, Dict[str, Any]]:
        """获取商家类型特定字段配置"""
        common_fields = {
            "company_description": {"required": True, "type": "textarea"},
        }

        type_specific_fields = {
            "factory": {
                "specific_products": {"required": True, "type": "text"},
                "own_brand": {"required": False, "type": "text"},
                "own_brand_operation_ability": {"required": False, "type": "text"},
                "oem_famous_brands": {"required": False, "type": "text"},
                "annual_production_capacity": {"required": True, "type": "text"},
                "need_mold_or_repackage": {"required": False, "type": "radio"},
                "estimated_mold_time": {"required": False, "type": "text"},
                "accept_brand_cocreation": {"required": True, "type": "radio"},
                "accept_deep_cooperation": {"required": True, "type": "radio"},
                "accept_online_exclusive": {"required": True, "type": "radio"},
                "accept_yaowang_authorization": {"required": True, "type": "radio"},
                "accept_omnichannel_dividend": {"required": True, "type": "radio"}
            },
            "brand": {
                "brand_name": {"required": True, "type": "text"},
                "brand_popularity": {"required": False, "type": "textarea"},
                "sales_data": {"required": False, "type": "textarea"},
                "cooperation_budget": {"required": False, "type": "text"}
            },
            "agent": {
                "agent_brand_name": {"required": False, "type": "text"},
                "brand_popularity": {"required": False, "type": "textarea"},
                "sales_data": {"required": False, "type": "textarea"},
                "cooperation_budget": {"required": False, "type": "text"}
            },
            "dealer": {
                "dealer_brand_name": {"required": False, "type": "text"},
                "brand_popularity": {"required": False, "type": "textarea"},
                "sales_data": {"required": False, "type": "textarea"},
                "cooperation_budget": {"required": False, "type": "text"}
            },
            "operator": {
                "operator_brand_name": {"required": True, "type": "text"},
                "brand_popularity": {"required": False, "type": "textarea"},
                "sales_data": {"required": False, "type": "textarea"},
                "cooperation_budget": {"required": False, "type": "text"}
            }
        }

        # 合并通用字段和特定字段
        fields = {**common_fields}
        if merchant_type in type_specific_fields:
            fields.update(type_specific_fields[merchant_type])

        return fields

    def _calculate_field_confidence(self, field_name: str, value: str, field_config: Dict[str, Any]) -> float:
        """计算单个字段的置信度"""
        base_confidence = 0.7

        # 根据字段类型调整置信度
        field_type = field_config.get("type", "text")

        if field_type == "phone":
            # 验证电话号码格式
            if self._validate_phone(value):
                base_confidence += 0.2
            else:
                base_confidence -= 0.3

        elif field_type == "email":
            # 验证邮箱格式
            if self._validate_email(value):
                base_confidence += 0.2
            else:
                base_confidence -= 0.3

        elif field_type == "radio":
            # 单选字段，检查是否为有效选项
            if value.lower() in ["是", "否", "yes", "no", "true", "false", "未确认"]:
                base_confidence += 0.1
            else:
                base_confidence -= 0.2

        elif field_type == "select":
            # 选择字段，检查长度和内容
            if len(value) > 2 and len(value) < 50:
                base_confidence += 0.1

        # 根据内容长度调整置信度
        if field_type in ["text", "textarea"]:
            if len(value) < 2:
                base_confidence -= 0.3
            elif len(value) > 100:
                base_confidence += 0.1

        # 检查是否包含关键词
        if field_name in ["company_name", "brand_name"] and any(keyword in value for keyword in ["有限公司", "股份", "集团", "科技", "实业"]):
            base_confidence += 0.1

        # 确保置信度在合理范围内
        return max(0.1, min(1.0, base_confidence))

    def _calculate_overall_confidence(self, suggestions: List[Dict[str, Any]]) -> float:
        """计算整体置信度"""
        if not suggestions:
            return 0.0
        
        total_confidence = sum(s.get("confidence", 0) for s in suggestions)
        return total_confidence / len(suggestions)
    
    async def validate_suggestions(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """验证和优化建议"""
        try:
            validated_suggestions = []
            for suggestion in suggestions:
                field_name = suggestion["field_name"]

                # 过滤掉置信度过低的建议
                if suggestion["confidence"] >= 0.3:
                    validated_suggestions.append(suggestion)
                else:
                    logger.warning(f"过滤低置信度字段: {field_name} (置信度: {suggestion['confidence']})")

            return validated_suggestions

        except Exception as e:
            logger.error(f"建议验证失败: {e}")
            return suggestions

    async def detect_merchant_type(self, content: str) -> str:
        """
        根据文档内容自动检测商家类型
        """
        try:
            content_lower = content.lower()

            # 工厂类型关键词
            factory_keywords = ['生产', '制造', '工厂', '产能', '生产线', '代工', 'oem', '年产', '产量', '车间', '设备']
            # 品牌商关键词
            brand_keywords = ['品牌', '商标', '自有品牌', '品牌推广', '品牌营销', '知名度', '品牌价值', '品牌影响力']
            # 代理商关键词
            agent_keywords = ['代理', '经销', '分销', '渠道', '代理权', '经销商', '授权', '代理商']
            # 代运营关键词
            operator_keywords = ['代运营', '运营', '托管', '代理运营', '电商运营', '店铺运营', '平台运营']

            factory_score = sum(1 for keyword in factory_keywords if keyword in content_lower)
            brand_score = sum(1 for keyword in brand_keywords if keyword in content_lower)
            agent_score = sum(1 for keyword in agent_keywords if keyword in content_lower)
            operator_score = sum(1 for keyword in operator_keywords if keyword in content_lower)

            logger.info(f"商家类型评分 - 工厂:{factory_score}, 品牌:{brand_score}, 代理:{agent_score}, 代运营:{operator_score}")

            # 返回得分最高的类型
            scores = {
                "factory": factory_score,
                "brand": brand_score,
                "agent": agent_score,
                "operator": operator_score
            }

            max_type = max(scores, key=scores.get)
            max_score = scores[max_type]

            # 如果最高分数太低，默认返回工厂类型
            if max_score < 2:
                logger.info("所有类型得分都较低，默认推荐工厂类型")
                return "factory"

            logger.info(f"推荐商家类型: {max_type} (得分: {max_score})")
            return max_type

        except Exception as e:
            logger.error(f"商家类型检测失败: {e}")
            return "factory"  # 默认返回工厂类型
    
    def _validate_phone(self, phone: str) -> bool:
        """验证电话号码格式"""
        import re
        # 简单的中国手机号验证
        pattern = r'^1[3-9]\d{9}$'
        return bool(re.match(pattern, phone.replace(' ', '').replace('-', '')))
    
    def _validate_email(self, email: str) -> bool:
        """验证邮箱格式"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

# 创建全局LLM服务实例
llm_service = LLMService()
