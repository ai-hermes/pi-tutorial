# DataAgent Core

宿主无关的数据层，提供：

- `openDataSource(path)`：打开 SQLite 或加载 CSV/TSV/JSON/JSONL
- `catalog()`：关系和字段目录
- `profile(relation)`：行数、空值、基数、范围和高频值
- `query(sql, { maxRows })`：受限只读查询
- `assertReadOnlySql(sql)`：保守的单语句 SQL 安全检查

所有适配器实现 `DataSourceAdapter`。表格文件在内存 SQLite 中映射为 `data` 表。
