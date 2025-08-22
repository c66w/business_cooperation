import requests
import json


def main(sql: str):
    """
    查询数据库（读取类SQL），调用 nl2query/sql_query 接口
    """
    try:
        payload = {
            "sql": sql,
            "connection_id": "66552525-f0aa-462e-abea-e25cd56ae8df"
        }

        resp = requests.post(
            "https://data-server-test.ywwl.com/nl2query/sql_query",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        # 直接把接口返回透传出去（保留中文）
        return {"result": json.dumps(data, ensure_ascii=False)}

    except Exception as e:
        return {"result": f"error:{str(e)}"}

if __name__ == "__main__":
    sql = '''
    SELECT
      user_id,
      company_name,
      attendee_name,
      contact_info,
      attendee_job,
      industry_operator
    FROM business_cooperation
    ORDER BY user_id'''
    print(main(sql))
