const fs = require("fs");
const path = require("path");

// 读取JSON配置文件
function readConfig(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("读取配置文件失败:", error.message);
    process.exit(1);
  }
}

// 生成mxCell XML节点
function createCell(id, value, style, parent, vertex = true, geometry = {}) {
  let cellXml = `<mxCell id="${id}"`;

  if (value !== undefined) {
    cellXml += ` value="${escapeXml(value)}"`;
  }

  if (style !== undefined) {
    cellXml += ` style="${escapeXml(style)}"`;
  }

  cellXml += ` parent="${parent}"`;

  if (vertex) {
    cellXml += ` vertex="1"`;
  } else {
    cellXml += ` edge="1"`;
  }

  cellXml += ">";

  // 添加几何信息
  if (Object.keys(geometry).length > 0) {
    cellXml += "<mxGeometry";

    for (const [key, value] of Object.entries(geometry)) {
      cellXml += ` ${key}="${value}"`;
    }

    cellXml += ' as="geometry" />';
  }

  cellXml += "</mxCell>";
  return cellXml;
}

// 转义XML特殊字符
function escapeXml(value) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 生成完整的Drawio XML
function generateDrawioXml(config) {
  const title = config.title || "架构图";
  const level1Items = config.level1 || [];
  const cfg = config.config || {};

  // 基础配置
  const titleFontSize = cfg.titleFontSize || 24;
  const level1FontSize = cfg.level1FontSize || 16;
  const nodeFontSize = cfg.nodeFontSize || 14;
  const nodeWidth = cfg.nodeWidth || 180;
  const nodeHeight = cfg.nodeHeight || 40;
  const levelPadding = cfg.levelPadding || 80;
  const nodePadding = cfg.nodePadding || 20;
  const framePadding = cfg.framePadding || 0;
  const maxNodesPerRow = cfg.maxNodesPerRow || 5; // 每行最大节点数
  const lastRowFillWidth = cfg.lastRowFillWidth || false;

  // 找出最长的一级标题
  let maxLengthTitle = "";
  level1Items.forEach((level1) => {
    if (level1.name.length > maxLengthTitle.length) {
      maxLengthTitle = level1.name;
    }
  });

  // 简单估算最长标题的宽度，每个字符大约占10个像素
  const level1Width = maxLengthTitle.length * 10 + 50;

  // 计算每个大框的宽度
  let maxFrameWidth = 0;
  level1Items.forEach((level1) => {
    const numRows = Math.ceil(level1.children.length / maxNodesPerRow);
    const rowWidth =
      Math.min(level1.children.length, maxNodesPerRow) *
      (nodeWidth + nodePadding);
    const frameWidth = rowWidth + 200;
    maxFrameWidth = Math.max(maxFrameWidth, frameWidth);
  });

  // 计算总宽度和高度
  let totalWidth = maxFrameWidth + 400;
  let totalHeight = 0;

  level1Items.forEach((level1) => {
    const numRows = Math.ceil(level1.children.length / maxNodesPerRow);
    const totalChildHeight = numRows * (nodeHeight + nodePadding) - nodePadding;
    totalHeight += totalChildHeight + framePadding;
  });

  totalHeight += 300;
  // 动态计算标题宽度
  const titleWidth = title.length * 50; // 每个字符大约占15个像素

  // 标题居中
  const titleX = (totalWidth - titleWidth) / 2;

  let xml = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Mozilla/5.0" version="21.8.0" etag="generated" type="device">
  <diagram id="finance-fund-analysis-architecture" name="${escapeXml(title)}">
    <mxGraphModel dx="${totalWidth}" dy="${totalHeight}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- 标题 -->
        ${createCell(
          "2",
          title,
          `text;align=center;verticalAlign=middle;whiteSpace=wrap;html=1;fontSize=${titleFontSize};fontStyle=1`,
          "1",
          true,
          { x: `${titleX}`, y: "20", width: `${titleWidth}`, height: "40" }
        )}

        <!-- 各层级和节点 -->`;

  let currentY = 80;
  let cellId = 3; // 从3开始，因为0、1、2已被使用

  // 生成层级和节点
  level1Items.forEach((level1, level1Index) => {
    const numRows = Math.ceil(level1.children.length / maxNodesPerRow);
    const totalChildHeight = numRows * (nodeHeight + nodePadding) - nodePadding;
    const level1Y = currentY + totalChildHeight / 2 - 15; // 一级内容上下居中

    // 计算包含一级和二级内容的大框的位置和大小
    const frameX = 200;
    const frameY = currentY - 20;
    const frameWidth = maxFrameWidth;
    const frameHeight = totalChildHeight + 40;

    // 生成大框
    const frameId = cellId++;
    xml += `
        <!-- 大框 -->
        ${createCell(
          frameId,
          "",
          `rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#3498db`,
          "1",
          true,
          {
            x: `${frameX}`,
            y: `${frameY}`,
            width: `${frameWidth}`,
            height: `${frameHeight}`,
          }
        )}`;

    // 一级标题（只显示文字）
    const level1Id = cellId++;
    const level1X = 250;
    xml += `
        <!-- ${level1.name} -->
        ${createCell(
          level1Id,
          level1.name,
          `text;align=left;verticalAlign=middle;whiteSpace=wrap;html=1;fontSize=${level1FontSize};fontStyle=1`,
          "1",
          true,
          {
            x: `${level1X}`,
            y: `${level1Y}`,
            width: `${level1Width}`,
            height: "30",
          }
        )}`;

    // 生成子节点
    let lastRowNodeCount = level1.children.length % maxNodesPerRow;
    if (lastRowNodeCount === 0) {
      lastRowNodeCount = maxNodesPerRow;
    }

    level1.children.forEach((child, childIndex) => {
      const rowIndex = Math.floor(childIndex / maxNodesPerRow);
      const colIndex = childIndex % maxNodesPerRow;

      let x, newNodeWidth;
      if (lastRowFillWidth && rowIndex === numRows - 1) {
        const availableWidth =
          frameWidth - 200 - (lastRowNodeCount - 1) * nodePadding - nodePadding;
        newNodeWidth = availableWidth / lastRowNodeCount;
        x = 400 + colIndex * (newNodeWidth + nodePadding);
      } else {
        x = 400 + colIndex * (nodeWidth + nodePadding);
        newNodeWidth = nodeWidth;
      }

      const y = currentY + rowIndex * (nodeHeight + nodePadding);

      const childId = cellId++;

      // 节点样式
      const nodeStyle = `rounded=1;whiteSpace=wrap;html=1;fillColor=${
        child.color || "#e1f0ff"
      };strokeColor=#3498db;fontSize=${nodeFontSize}`;

      // 添加节点
      xml += `
        ${createCell(childId, child.name, nodeStyle, "1", true, {
          x: `${x}`,
          y: `${y}`,
          width: `${newNodeWidth}`,
          height: `${nodeHeight}`,
        })}`;
    });

    // 更新当前Y坐标，为下一层级留出空间
    currentY += totalChildHeight + framePadding;
  });

  // END
  xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return xml;
}

// 主函数
function main() {
  const configPath = process.argv[2] || "./config.json";
  const outputPath = process.argv[3] || "./architecture.drawio";

  // 读取配置
  const config = readConfig(configPath);

  // 生成XML
  const xml = generateDrawioXml(config);

  // 写入文件
  fs.writeFileSync(outputPath, xml, "utf8");

  console.log(`架构图已成功生成并保存到 ${outputPath}`);
  console.log(`可以在Drawio中打开此文件查看架构图：https://app.diagrams.net/`);
}

// 执行主函数
main();
