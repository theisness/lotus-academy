# Bug 修复总结

## 修复日期
2026-04-21

## 修复的 Bug 数量
5 个

## Bug 列表

### 1. 非管理员查看公共书籍信息按钮 ✅
- **状态**: 已修复
- **影响**: 所有非管理员用户
- **优先级**: 高
- **文件**: 4 个文件修改，1 个新文件

### 2. 分组标签自动搜索匹配 ✅
- **状态**: 已修复
- **影响**: 管理员
- **优先级**: 中
- **文件**: 1 个文件修改

### 3. 管理员设置分组标签后看不见书籍 ✅
- **状态**: 已修复
- **影响**: 管理员
- **优先级**: 高
- **文件**: 1 个数据库函数更新

### 4. 字体需要联网下载 ✅
- **状态**: 已修复
- **影响**: 所有用户
- **优先级**: 中
- **文件**: 1 个文件修改

### 5. 前端页面经常空白 ✅
- **状态**: 已修复
- **影响**: 所有用户
- **优先级**: 高
- **文件**: 4 个文件修改

## 修改统计

### 前端文件
- 修改: 7 个文件
- 新增: 1 个文件
- 删除: 0 个文件

### 后端文件
- 修改: 1 个文件
- 新增: 1 个文件
- 删除: 0 个文件

### 脚本文件
- 新增: 1 个文件

### 文档文件
- 新增: 2 个文件

## 部署步骤

### 快速部署
```powershell
.\script\deploy_bug_fixes.ps1
```

### 手动部署
1. 部署数据库修复:
   ```powershell
   # 上传 SQL 文件
   scp -P 60000 backend/fix_is_book_visible.sql root@111.170.170.151:/tmp/
   
   # 执行 SQL
   ssh -p 60000 root@111.170.170.151 'cd /opt/lotus-academy && docker compose -f docker/docker-compose.yml exec -T db psql -U postgres -d postgres -f /tmp/fix_is_book_visible.sql'
   ```

2. 部署前端:
   ```powershell
   .\script\frontend_online.ps1
   ```

## 测试清单

- [ ] 非管理员可以看到书籍信息按钮
- [ ] 点击信息按钮显示书籍详情
- [ ] 分组标签输入有自动建议
- [ ] 点击建议可快速添加标签
- [ ] 管理员设置分组标签后仍能看到书籍
- [ ] 字体从本地加载（无外部请求）
- [ ] 页面不再空白
- [ ] 错误时优雅降级

## 回滚方案

如果部署后出现问题，可以快速回滚：

### 回滚前端
```powershell
# 回滚到上一个版本
git checkout HEAD~1 -- frontend/
.\script\frontend_online.ps1
```

### 回滚数据库函数
```sql
-- 恢复原始的 is_book_visible 函数
CREATE OR REPLACE FUNCTION is_book_visible(book_row books, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tag_count INT;
  match_count INT;
  viewer_tags TEXT[];
BEGIN
  IF book_row.type = 'private' THEN
    RETURN book_row.uploader_id = viewer_id;
  END IF;

  SELECT COUNT(*) INTO tag_count
  FROM book_group_tags
  WHERE book_id = book_row.id;

  IF tag_count = 0 THEN
    RETURN TRUE;
  END IF;

  IF viewer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT group_tags INTO viewer_tags
  FROM profiles
  WHERE id = viewer_id;

  SELECT COUNT(*) INTO match_count
  FROM book_group_tags
  WHERE book_id = book_row.id
    AND group_tag = ANY(viewer_tags);

  RETURN match_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 相关文档

- [详细修复日志](./BUG_FIX_LOG_2026-04-21.md)
- [部署脚本使用指南](../script/README_DEPLOYMENT.md)
- [部署配置说明](../script/DEPLOYMENT_CONFIG.md)

## 注意事项

1. **数据库更新**: 必须先部署数据库修复，再部署前端
2. **缓存清理**: 部署后建议清理浏览器缓存
3. **测试验证**: 部署后务必测试所有修复的功能
4. **监控**: 部署后观察错误日志，确保没有新问题

## 联系方式

如有问题，请查看：
- 详细日志: `docs/BUG_FIX_LOG_2026-04-21.md`
- 部署指南: `script/README_DEPLOYMENT.md`
- 故障排查: `TROUBLESHOOTING_503.md`
