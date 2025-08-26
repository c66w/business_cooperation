/**
 * 检查SQLite数据库中的数据
 */

require('dotenv').config();
const { initializeDatabase, execute, closeDatabase } = require('../config/database-sqlite');

async function checkDatabaseData() {
  try {
    console.log('🔍 检查SQLite数据库数据...\n');

    // 初始化数据库连接
    await initializeDatabase();

    // 检查商家合作数据
    console.log('📋 商家合作数据:');
    const businesses = await execute('SELECT * FROM business_cooperation ORDER BY created_at DESC LIMIT 10');
    if (businesses.length > 0) {
      businesses.forEach((business, index) => {
        console.log(`  ${index + 1}. ${business.company_name} (${business.user_id})`);
        console.log(`     类型: ${business.merchant_type}, 状态: ${business.status}`);
        console.log(`     联系人: ${business.attendee_name}, 电话: ${business.contact_info}`);
        console.log(`     创建时间: ${business.created_at}`);
        console.log('');
      });
    } else {
      console.log('  暂无数据');
    }

    // 检查商家详细信息
    console.log('📝 商家详细信息:');
    const details = await execute('SELECT * FROM merchant_details ORDER BY created_at DESC LIMIT 10');
    if (details.length > 0) {
      details.forEach((detail, index) => {
        console.log(`  ${index + 1}. ${detail.user_id} - ${detail.field_name}: ${detail.field_value}`);
      });
    } else {
      console.log('  暂无数据');
    }

    // 检查工作流任务
    console.log('\n⚙️  工作流任务:');
    const tasks = await execute('SELECT * FROM workflow_tasks ORDER BY created_at DESC LIMIT 10');
    if (tasks.length > 0) {
      tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (${task.task_id})`);
        console.log(`     用户: ${task.user_id}, 类型: ${task.task_type}, 状态: ${task.status}`);
        console.log(`     分配给: ${task.assigned_to || '未分配'}`);
        console.log(`     创建时间: ${task.created_at}`);
        console.log('');
      });
    } else {
      console.log('  暂无数据');
    }

    // 检查工作流历史
    console.log('📚 工作流历史:');
    const history = await execute('SELECT * FROM workflow_history ORDER BY created_at DESC LIMIT 10');
    if (history.length > 0) {
      history.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.action} - ${record.actor_type} (${record.user_id})`);
        console.log(`     任务ID: ${record.task_id || '无'}`);
        console.log(`     状态变化: ${record.from_status || '无'} → ${record.to_status || '无'}`);
        console.log(`     时间: ${record.created_at}`);
        console.log('');
      });
    } else {
      console.log('  暂无数据');
    }

    // 检查通知记录
    console.log('📧 通知记录:');
    const notifications = await execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
    if (notifications.length > 0) {
      notifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.channel})`);
        console.log(`     用户: ${notification.user_id}, 状态: ${notification.status}`);
        console.log(`     时间: ${notification.created_at}`);
        console.log('');
      });
    } else {
      console.log('  暂无数据');
    }

    // 统计信息
    console.log('📊 数据统计:');
    const stats = await Promise.all([
      execute('SELECT COUNT(*) as count FROM business_cooperation'),
      execute('SELECT COUNT(*) as count FROM merchant_details'),
      execute('SELECT COUNT(*) as count FROM workflow_tasks'),
      execute('SELECT COUNT(*) as count FROM workflow_history'),
      execute('SELECT COUNT(*) as count FROM notifications'),
      execute('SELECT COUNT(*) as count FROM reviewers'),
      execute('SELECT COUNT(*) as count FROM system_config')
    ]);

    console.log(`  商家合作记录: ${stats[0][0].count}`);
    console.log(`  商家详细信息: ${stats[1][0].count}`);
    console.log(`  工作流任务: ${stats[2][0].count}`);
    console.log(`  工作流历史: ${stats[3][0].count}`);
    console.log(`  通知记录: ${stats[4][0].count}`);
    console.log(`  审核员: ${stats[5][0].count}`);
    console.log(`  系统配置: ${stats[6][0].count}`);

    console.log('\n✅ 数据检查完成');

  } catch (error) {
    console.error('❌ 检查数据失败:', error.message);
    console.error(error.stack);
  } finally {
    await closeDatabase();
  }
}

// 运行检查
if (require.main === module) {
  checkDatabaseData();
}

module.exports = { checkDatabaseData };
