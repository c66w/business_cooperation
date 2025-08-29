/**
 * 表单配置路由
 * 提供动态表单字段配置功能
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * 获取指定商家类型的动态字段配置
 */
router.get('/fields/:merchantType', async (req, res) => {
  try {
    const { merchantType } = req.params;
    const { execute } = require('../config/database-sqlite');

    console.log(`📋 获取商家类型字段配置: ${merchantType}`);

    // 验证商家类型
    const validTypes = ['factory', 'brand', 'agent', 'dealer', 'operator'];
    if (!validTypes.includes(merchantType)) {
      return res.status(400).json({
        success: false,
        message: '无效的商家类型'
      });
    }

    // 从数据库获取字段配置
    const fields = await execute(`
      SELECT 
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        validation_rules,
        display_order
      FROM merchant_type_fields 
      WHERE merchant_type = ? AND is_active = 1
      ORDER BY display_order ASC, field_name ASC
    `, [merchantType]);

    // 处理字段选项和验证规则（JSON字符串转对象）
    const processedFields = fields.map(field => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : null,
      validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
      is_required: Boolean(field.is_required)
    }));

    console.log(`✅ 获取到 ${processedFields.length} 个字段配置`);

    res.json({
      success: true,
      data: processedFields
    });

  } catch (error) {
    console.error('获取字段配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字段配置失败',
      error: error.message
    });
  }
});

/**
 * 获取所有商家类型的字段配置（管理员用）
 */
router.get('/fields', authenticateToken, async (req, res) => {
  try {
    const { execute } = require('../config/database-sqlite');

    console.log('📋 获取所有字段配置');

    const fields = await execute(`
      SELECT 
        merchant_type,
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        validation_rules,
        display_order,
        is_active
      FROM merchant_type_fields 
      ORDER BY merchant_type ASC, display_order ASC, field_name ASC
    `);

    // 按商家类型分组
    const fieldsByType = {};
    fields.forEach(field => {
      if (!fieldsByType[field.merchant_type]) {
        fieldsByType[field.merchant_type] = [];
      }
      
      fieldsByType[field.merchant_type].push({
        ...field,
        field_options: field.field_options ? JSON.parse(field.field_options) : null,
        validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
        is_required: Boolean(field.is_required),
        is_active: Boolean(field.is_active)
      });
    });

    console.log(`✅ 获取到 ${Object.keys(fieldsByType).length} 种商家类型的字段配置`);

    res.json({
      success: true,
      data: fieldsByType
    });

  } catch (error) {
    console.error('获取所有字段配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字段配置失败',
      error: error.message
    });
  }
});

/**
 * 更新字段配置（管理员用）
 */
router.put('/fields/:merchantType/:fieldName', authenticateToken, async (req, res) => {
  try {
    const { merchantType, fieldName } = req.params;
    const { 
      field_label, 
      field_type, 
      field_options, 
      is_required, 
      validation_rules, 
      display_order,
      is_active 
    } = req.body;

    const { execute } = require('../config/database-sqlite');

    console.log(`📝 更新字段配置: ${merchantType}.${fieldName}`);

    // 更新字段配置
    await execute(`
      UPDATE merchant_type_fields 
      SET 
        field_label = ?,
        field_type = ?,
        field_options = ?,
        is_required = ?,
        validation_rules = ?,
        display_order = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE merchant_type = ? AND field_name = ?
    `, [
      field_label,
      field_type,
      field_options ? JSON.stringify(field_options) : null,
      is_required ? 1 : 0,
      validation_rules ? JSON.stringify(validation_rules) : null,
      display_order || 0,
      is_active ? 1 : 0,
      merchantType,
      fieldName
    ]);

    console.log(`✅ 字段配置更新成功: ${merchantType}.${fieldName}`);

    res.json({
      success: true,
      message: '字段配置更新成功'
    });

  } catch (error) {
    console.error('更新字段配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新字段配置失败',
      error: error.message
    });
  }
});

module.exports = router;
