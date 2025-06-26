const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// 架构转换器类
class ArchitectureConverter {
  constructor(config) {
    // 使用外部配置或默认值
    this.config = {
      primaryBoxPadding: config.primaryBoxPadding || 40,
      basePrimaryYGap: config.basePrimaryYGap || 450,
      secondaryXGap: config.secondaryXGap || 350,
      tertiaryYGap: config.tertiaryYGap || 40,
      tertiaryXGap: config.tertiaryXGap || 30,
      columnsThreshold: config.columnsThreshold || 5,
      primaryColor: config.primaryColor || "#6495ed",
      secondaryColor: config.secondaryColor || "#4a86e8",
      tertiaryColor: config.tertiaryColor || "#6495ed",
      boxColor: config.boxColor || "#94a3b8",
      boxOpacity: config.boxOpacity || "30",
      primaryFontSize: config.primaryFontSize || 24,
      secondaryFontSize: config.secondaryFontSize || 18,
      tertiaryFontSize: config.tertiaryFontSize || 14,
      secondaryTitleHeight: config.secondaryTitleHeight || 50,
    };

    // ID管理
    this.idCounter = 2;
    // this.idMap = new Map();
  }

  // 生成唯一ID
  generateId() {
    return this.idCounter++;
  }

  // 获取节点ID
  // getNodeId(name) {
  //   if (this.idMap.has(name)) {
  //     return this.idMap.get(name);
  //   }

  //   const id = this.generateId();
  //   this.idMap.set(name, id);
  //   return id;
  // }

  // 主转换方法
  convert(jsonData, outputPath = "architecture.drawio") {
    if (!jsonData || !jsonData.children || jsonData.children.length === 0) {
      throw new Error("Invalid architecture data");
    }

    this.idCounter = 2;
    // this.idMap.clear();

    const layoutData = this.calculateLayout(jsonData);
    const xml = this.generateXml(jsonData, layoutData);

    fs.writeFileSync(outputPath, xml);
    console.log(`Draw.io文件已生成: ${path.resolve(outputPath)}`);

    return outputPath;
  }

  // 计算节点布局
  calculateLayout(root) {
    const layout = {
      primary: [],
      secondary: [],
      tertiary: [],
      primaryBoxes: [],
    };

    // 计算每个一级节点的内容高度
    const primaryHeights = root.children.map((primaryNode) => {
      let maxSecondaryHeight = 0;

      primaryNode.children.forEach((secondaryNode) => {
        const tertiaryCount = secondaryNode.children.length;
        const useColumns = tertiaryCount > this.config.columnsThreshold;
        const columns = useColumns ? 2 : 1;
        const rows = Math.ceil(tertiaryCount / columns);
        // 计算二级节点高度和宽度
        const secondaryHeight =
          this.config.secondaryTitleHeight + rows * this.config.tertiaryYGap;
        // const secondaryWidth = useColumns ? 580 : 300; // 单列300px，双列580px
        maxSecondaryHeight = Math.max(maxSecondaryHeight, secondaryHeight);
      });

      return maxSecondaryHeight + this.config.primaryBoxPadding * 2;
    });

    // 计算所有一级节点外框的最大宽度
    let maxBoxWidth = 0;
    root.children.forEach((primaryNode) => {
      // const boxWidth =
      //   this.config.secondaryXGap * primaryNode.children.length + 300;

      let boxWidth = 0;
      primaryNode.children.forEach((secondaryNode) => {
        const tertiaryCount = secondaryNode.children.length;
        const useColumns = tertiaryCount > this.config.columnsThreshold;
        boxWidth += useColumns ? 630 : this.config.secondaryXGap;
      });
      boxWidth += 300;

      maxBoxWidth = Math.max(maxBoxWidth, boxWidth);
    });
    // 动态计算一级节点的Y坐标
    let currentY = 250;
    root.children.forEach((primaryNode, primaryIndex) => {
      const boxHeight = primaryHeights[primaryIndex];
      const boxX = 250;

      // 一级功能外框
      layout.primaryBoxes.push({
        x: boxX,
        y: currentY,
        width: maxBoxWidth, // 使用最大宽度
        height: boxHeight,
        name: primaryNode.name,
      });

      // 一级功能标题
      layout.primary.push({
        name: primaryNode.name,
        x: boxX + this.config.primaryBoxPadding,
        y: currentY + boxHeight / 2 - 20, // -20 差不多居中就行了,文字的高度比较难获取
        children: [],
      });

      let prevSecondaryUseCol = 0; // 记录有多少个节点是两列的
      primaryNode.children.forEach((secondaryNode, secondaryIndex) => {
        const tertiaryCount = secondaryNode.children.length;
        const useColumns = tertiaryCount > this.config.columnsThreshold;
        const columns = useColumns ? 2 : 1;
        const secondaryWidth = useColumns ? 580 : 300; // 单列300px，双列580px

        // const secondaryX =
        //   boxX + 300 + secondaryIndex * this.config.secondaryXGap;
        const secondaryX =
          boxX +
          300 +
          secondaryIndex * this.config.secondaryXGap +
          prevSecondaryUseCol * (630 - this.config.secondaryXGap); // 调整secondaryX的计算
        const secondaryY = currentY + this.config.primaryBoxPadding;

        // 二级功能
        layout.secondary.push({
          name: secondaryNode.name,
          x: secondaryX,
          y: secondaryY,
          width: secondaryWidth, // 更新二级节点宽度
          height: boxHeight - this.config.primaryBoxPadding * 2,
          children: [],
        });

        layout.primary[primaryIndex].children.push(secondaryNode.name);

        secondaryNode.children.forEach((tertiaryNode, tertiaryIndex) => {
          let tertiaryXOffset = 0;
          if (useColumns) {
            // 计算三级节点的X偏移量
            tertiaryXOffset =
              (tertiaryIndex % 2) * (this.config.tertiaryXGap + 250);
          }
          // 三级功能
          layout.tertiary.push({
            name: tertiaryNode.name,
            x: secondaryX + 20 + tertiaryXOffset,
            y:
              secondaryY +
              this.config.secondaryTitleHeight +
              Math.floor(tertiaryIndex / columns) * this.config.tertiaryYGap,
            parent: secondaryNode.name,
          });

          layout.secondary[layout.secondary.length - 1].children.push(
            tertiaryNode.name
          );
        });
        // prevSecondaryWidth = secondaryWidth; // 更新上一个二级节点的宽度
        if (useColumns) prevSecondaryUseCol++;
      });

      // 更新下一个一级节点的Y坐标，添加额外间距
      currentY += boxHeight + this.config.basePrimaryYGap * 0.5;
    });

    return layout;
  }

  // 生成XML内容
  generateXml(jsonData, layout) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Node.js Converter" version="21.8.0" etag="generated" type="device">
  <diagram id="financial-architecture" name="${jsonData.name}">
    <mxGraphModel dx="1800" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="0" arrows="0" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- 标题 -->
        <mxCell id="${this.generateId()}" value="${
      jsonData.name
    }" style="text;html=1;strokeColor=none;fillColor=none;fontSize=28;fontStyle=1;textAlign=center;" vertex="1" parent="1">
          <mxGeometry x="800" y="50" width="400" height="40" as="geometry" />
        </mxCell>

        <!-- 生成一级节点外框 -->
        ${this.generatePrimaryBoxes(layout.primaryBoxes)}

        <!-- 生成一级节点 -->
        ${this.generatePrimaryNodes(layout.primary)}

        <!-- 生成二级节点（直角边框） -->
        ${this.generateSecondaryNodes(layout.secondary)}

        <!-- 生成三级节点 -->
        ${this.generateTertiaryNodes(layout.tertiary)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    return xml;
  }

  // 生成一级节点外框
  generatePrimaryBoxes(boxes) {
    return boxes
      .map(
        (box) => `
        <mxCell id="${this.generateId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${
          this.config.boxColor
        };opacity=${this.config.boxOpacity};" vertex="1" parent="1">
          <mxGeometry x="${box.x}" y="${box.y}" width="${box.width}" height="${
          box.height
        }" as="geometry" />
        </mxCell>
    `
      )
      .join("");
  }

  // 生成一级节点
  generatePrimaryNodes(primaryNodes) {
    return primaryNodes
      .map(
        (node) => `
        <mxCell id="${this.generateId()}" value="${
          node.name
        }" style="text;html=1;strokeColor=none;fillColor=none;fontSize=${
          this.config.primaryFontSize
        };fontStyle=1;textAlign=center;fontWeight=bold;" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${
          node.y
        }" width="200" height="40" as="geometry" />
        </mxCell>
    `
      )
      .join("");
  }

  // 生成二级节点
  generateSecondaryNodes(secondaryNodes) {
    return secondaryNodes
      .map(
        (node) => `
        <mxCell id="${this.generateId()}" value="${
          node.name
        }" style="whiteSpace=wrap;html=1;fillColor=#e6f2ff;strokeColor=${
          this.config.primaryColor
        };fontSize=${
          this.config.secondaryFontSize
        };textAlign=center;verticalAlign=top;paddingTop=10;rounded=0;" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${node.y}" width="${
          node.width
        }" height="${node.height}" as="geometry" />
        </mxCell>
    `
      )
      .join("");
  }

  // 生成三级节点
  generateTertiaryNodes(tertiaryNodes) {
    return tertiaryNodes
      .map(
        (node) => `
        <mxCell id="${this.generateId()}" value="${
          node.name
        }" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f0f8ff;strokeColor=${
          this.config.tertiaryColor
        };fontSize=${this.config.tertiaryFontSize};" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${
          node.y
        }" width="260" height="35" as="geometry" />
        </mxCell>
    `
      )
      .join("");
  }
}

// 打开文件的跨平台函数
function openFile(filePath) {
  return new Promise((resolve, reject) => {
    let command;

    if (process.platform === "win32") {
      command = `start "" "${filePath}"`;
    } else if (process.platform === "darwin") {
      command = `open "${filePath}"`;
    } else {
      command = `xdg-open "${filePath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error(`无法自动打开文件，请手动在Draw.io中打开: ${filePath}`);
        reject(error);
      } else {
        console.log(`已在Draw.io中打开文件: ${filePath}`);
        resolve();
      }
    });
  });
}

// 主程序
async function main() {
  try {
    // 读取配置文件
    const configFile = process.argv[2] || "config.json";
    const configData = fs.readFileSync(configFile, "utf8");
    const config = JSON.parse(configData);

    // 创建转换器实例
    const converter = new ArchitectureConverter(config.layout || {});

    // 转换并生成文件
    const outputPath = converter.convert(
      config.architecture,
      config.outputPath || "architecture.drawio"
    );

    // 自动打开文件
    await openFile(outputPath);
  } catch (error) {
    console.error("生成失败:", error.message);
    process.exit(1);
  }
}

// 执行主程序
main();
