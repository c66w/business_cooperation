/**
 * 直接测试SQLite数据库功能
 * 验证数据保存和查询功能
 */

require('dotenv').config();
const { initializeDatabase, execute, beginTransaction, closeDatabase } = require('../config/database-sqlite');

async function testSQLiteDirectly() {
  try {
    console.log('🚀 开始直接测试SQLite数据库功能...\n');

    // 初始化数据库连接
    await initializeDatabase();

    // 测试1: 插入商家合作数据
    console.log('📝 测试1: 插入商家合作数据');
    const userId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const businessData = {
      user_id: userId,
      company_name: '直接测试公司',
      attendee_name: '测试联系人',
      contact_info: '13800138000',
      attendee_job: '经理',
      industry_operator: '测试运营商',
      merchant_type: 'factory',
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    const insertResult = await execute(`
      INSERT INTO business_cooperation 
      (user_id, company_name, attendee_name, contact_info, attendee_job, industry_operator, merchant_type, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      businessData.user_id,
      businessData.company_name,
      businessData.attendee_name,
      businessData.contact_info,
      businessData.attendee_job,
      businessData.industry_operator,
      businessData.merchant_type,
      businessData.status,
      businessData.submitted_at
    ]);

    console.log('✅ 商家数据插入成功，ID:', insertResult[0].insertId);

    // 测试2: 插入商家详细信息
    console.log('\n📝 测试2: 插入商家详细信息');
    const detailsData = [
      { field_name: 'product_category', field_value: '美妆' },
      { field_name: 'specific_products', field_value: '面膜' },
      { field_name: 'annual_production_capacity', field_value: '100万件' },
      { field_name: 'accept_deep_cooperation', field_value: '是' }
    ];

    for (const detail of detailsData) {
      await execute(`
        INSERT INTO merchant_details (user_id, merchant_type, field_name, field_value)
        VALUES (?, ?, ?, ?)
      `, [userId, 'factory', detail.field_name, detail.field_value]);
    }

    console.log('✅ 商家详细信息插入成功');

    // 测试3: 插入工作流任务
    console.log('\n📝 测试3: 插入工作流任务');
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    await execute(`
      INSERT INTO workflow_tasks 
      (task_id, user_id, task_type, status, title, description, priority, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      userId,
      'manual_review',
      'pending',
      '测试审核任务',
      '这是一个测试任务',
      'medium',
      JSON.stringify({ test: true })
    ]);

    console.log('✅ 工作流任务插入成功，任务ID:', taskId);

    // 测试4: 插入工作流历史
    console.log('\n📝 测试4: 插入工作流历史');
    await execute(`
      INSERT INTO workflow_history 
      (user_id, task_id, action, actor_type, actor_id, actor_name, to_status, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      taskId,
      'created',
      'system',
      'test_system',
      '测试系统',
      'pending',
      '任务创建测试'
    ]);

    console.log('✅ 工作流历史插入成功');

    // 测试5: 事务测试
    console.log('\n📝 测试5: 事务功能测试');
    const transaction = await beginTransaction();
    
    try {
      const testUserId = `trans_test_${Date.now()}`;
      
      await transaction.execute(`
        INSERT INTO business_cooperation 
        (user_id, company_name, attendee_name, contact_info, merchant_type, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [testUserId, '事务测试公司', '事务测试人', '13900139000', 'brand', 'draft']);

      await transaction.execute(`
        INSERT INTO merchant_details (user_id, merchant_type, field_name, field_value)
        VALUES (?, ?, ?, ?)
      `, [testUserId, 'brand', 'brand_name', '测试品牌']);

      await transaction.commit();
      console.log('✅ 事务提交成功');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 事务失败，已回滚:', error.message);
    }

    // 测试6: 查询数据
    console.log('\n📝 测试6: 查询数据验证');
    
    const businesses = await execute('SELECT * FROM business_cooperation ORDER BY created_at DESC LIMIT 5');
    console.log(`✅ 查询到 ${businesses.length} 条商家记录`);
    
    const details = await execute('SELECT * FROM merchant_details ORDER BY created_at DESC LIMIT 10');
    console.log(`✅ 查询到 ${details.length} 条详细信息记录`);
    
    const tasks = await execute('SELECT * FROM workflow_tasks ORDER BY created_at DESC LIMIT 5');
    console.log(`✅ 查询到 ${tasks.length} 条任务记录`);
    
    const history = await execute('SELECT * FROM workflow_history ORDER BY created_at DESC LIMIT 10');
    console.log(`✅ 查询到 ${history.length} 条历史记录`);

    // 显示详细数据
    console.log('\n📊 数据详情:');
    if (businesses.length > 0) {
      console.log('最新商家记录:');
      businesses.forEach((business, index) => {
        console.log(`  ${index + 1}. ${business.company_name} (${business.user_id}) - ${business.status}`);
      });
    }

    if (tasks.length > 0) {
      console.log('\n最新任务记录:');
      tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (${task.task_id}) - ${task.status}`);
      });
    }

    console.log('\n🎉 SQLite数据库功能测试完成！所有功能正常工作。');

  } catch (error) {
    console.error('\n❌ SQLite测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await closeDatabase();
  }
}

// 运行测试
if (require.main === module) {
  testSQLiteDirectly();
}

module.exports = { testSQLiteDirectly };
