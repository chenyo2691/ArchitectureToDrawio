# 财务域资金分析应用架构图生成工具

## 概述

本工具用于根据配置文件生成财务域资金分析应用架构图的 Drawio XML 文件。通过修改配置文件中的相关信息，可以定制架构图的标题、层级结构、节点样式等内容。

## 配置文件说明

配置文件 `config.json` 包含了架构图的核心配置信息，以下是对其各部分的详细说明：

### 标题（`title`）

- **类型**：字符串
- **描述**：架构图的主标题，显示在架构图的顶部。
- **示例**：

```json
"title": "财务域资金分析应用架构图"
```

### 层级结构（`level1`）

- **类型**：数组
- **描述**：包含架构图的一级层级信息，每个一级层级下可以有多个子节点。
- **一级层级对象属性**：
  - `name`：一级层级的名称，显示在架构图中。
  - `children`：子节点数组，每个子节点是一个对象，包含 `name` 属性，用于显示子节点的名称。
- **示例**：

```json
"level1": [
  {
    "name": "数据接入层",
    "children": [
      { "name": "银行账户系统" },
      { "name": "ERP系统(资金模块)" },
      ...
    ]
  },
  {
    "name": "数据处理层",
    "children": [
      { "name": "ETL工具(资金数据抽取)" },
      { "name": "数据清洗与标准化" },
      ...
    ]
  },
  ...
]
```

### 通用配置（`config`）

- **类型**：对象
- **描述**：包含架构图的通用配置信息，如字体大小、节点尺寸、边距等。
- **属性说明**：
  - `titleFontSize`：标题的字体大小，默认为 24。
  - `level1FontSize`：一级层级名称的字体大小，默认为 16。
  - `nodeFontSize`：子节点名称的字体大小，默认为 14。
  - `nodeWidth`：子节点的宽度，默认为 180。
  - `nodeHeight`：子节点的高度，默认为 40。
  - `levelPadding`：层级之间的垂直间距，默认为 80。
  - `nodePadding`：节点之间的水平间距，默认为 20。
  - `connectionStyle`：连接线的样式，默认为 `"endArrow=classic;html=1;rounded=0;exitX=1;exitY=0.5;entryX=0;entryY=0.5"`。
  - `framePadding`：大框（包含一级和二级内容）的垂直边距，默认为 50。
  - `maxNodesPerRow`：每行最多显示的子节点数量，默认为 5。
- **示例**：

```json
"config": {
  "titleFontSize": 24,
  "level1FontSize": 16,
  "nodeFontSize": 14,
  "nodeWidth": 180,
  "nodeHeight": 40,
  "levelPadding": 80,
  "nodePadding": 20,
  "connectionStyle": "endArrow=classic;html=1;rounded=0;exitX=1;exitY=0.5;entryX=0;entryY=0.5",
  "framePadding": 50,
  "maxNodesPerRow": 5
}
```

## 使用方法

1. **安装依赖**：确保你的环境中已经安装了 Node.js。
2. **修改配置文件**：根据需求修改 `config.json` 文件中的配置信息。
3. **运行脚本**：在终端中执行以下命令：

```bash
node index.js [配置文件路径] [输出文件路径]
```

- `[配置文件路径]`：可选参数，指定配置文件的路径，默认为 `./config.json`。
- `[输出文件路径]`：可选参数，指定生成的 Drawio XML 文件的输出路径，默认为 `./architecture.drawio`。

4. **查看架构图**：生成的架构图文件可以在 [Drawio](https://app.diagrams.net/) 中打开查看。

## 注意事项

- 配置文件中的所有字符串值需要使用双引号括起来。
- 修改配置文件时，请确保 JSON 格式的正确性，避免出现语法错误。
