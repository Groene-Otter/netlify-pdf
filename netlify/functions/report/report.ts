import chromium from "@sparticuz/chromium";
import "dotenv/config";
import { PDFDocument } from "pdf-lib";
import puppeteer from "puppeteer-core";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

type PageBlock = {
  cover: boolean;
  pages: string;
};

// Note: Netlify deploys this function at the endpoint /.netlify/functions/report
export const handler = async (req) => {
  if (req.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    };
  }

  if (!req.body) {
    return {
      statusCode: 400,
      body: "Need to have a body",
    };
  }

  console.log("Starting pdf generation...");

  const {
    pageBlocks,
    styles,
    logoDataUrl,
    title,
    headerColor,
  }: {
    pageBlocks: PageBlock[];
    styles: string[];
    logoDataUrl: string;
    title: string;
    headerColor: string;
  } = JSON.parse(req.body);

  const browser = await puppeteer.launch({
    args: [
      ...(process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args),
      "--disable-web-security",
      "--disable-features=site-per-process",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: process.env.IS_LOCAL
      ? "/tmp/localChromium/chromium/linux-1122391/chrome-linux/chrome"
      : process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
    headless: process.env.IS_LOCAL ? false : chromium.headless,
  });
  const page = await browser.newPage();

  page.on("error", (error) => console.error(error));

  const pdfBlocks: Uint8Array[] = [];
  for (const [index, block] of pageBlocks.entries()) {
    console.log(`Creating pdf ${index} of ${pageBlocks.length}`);
    console.log(block.pages);

    await page.setContent(block.pages, {
      waitUntil: ["domcontentloaded", "load", "networkidle0"],
    });
    console.log(1);

    await page.addStyleTag({
      url: "https://unpkg.com/open-props@1.7.15/open-props.min.css",
    });
    console.log(2);
    await page.addStyleTag({
      url: "https://unpkg.com/open-props@1.7.15/normalize.light.min.css",
    });
    console.log(3);
    await page.addStyleTag({
      url: "https://fonts.bunny.net/css?family=poppins:100,400,900",
    });
    console.log(4);
    await page.addStyleTag({
      url: "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css",
    });
    await page.waitForNetworkIdle();
    console.log(5);
    for (const style of styles) {
      await page.addStyleTag({ content: style });
    }
    console.log(6);
    // For colour usage
    await page.addStyleTag({
      content: `
        html {
          -webkit-print-color-adjust: exact !important;
          font-size: 16px;
          background: white;
          }
          `,
    });
    console.log(7);
    await page.addStyleTag({
      content: `
        @page {
          size: a4 landscape;
          padding-block: ${block.cover ? "0" : "1.05in"};
          padding-inline: ${block.cover ? "0" : ".5in"};
        }
      `,
    });
    console.log(8);
    await page.setBypassCSP(true);
    await page.emulateMediaType("print");
    console.log(9);
    pdfBlocks.push(
      await page.pdf({
        format: "A4",
        preferCSSPageSize: true,
        displayHeaderFooter: !block.cover,
        printBackground: true,
        headerTemplate: `
    <style>
      html {
        -webkit-print-color-adjust: exact !important;
      }
      .header {
        display: flex;
        flex-direction: column;
        gap: 32px;
        color: #495057;
        font-size: 16px;
        width: 100%;
        padding-inline: .5in;

        .info {
          display: flex;
          margin-inline: 64px;
          justify-content: space-between;

          /* Cannot use page numbering because of split-up page generation
          Check this perhaps: https://github.com/puppeteer/puppeteer/issues/3383
          */
          .pageNumber {
            display: none;
          }
        }

        hr {
          margin: 0;
          padding: 0;
          border: 5px solid ${headerColor};
          width: 100%;
        }
      }
    </style>
    <div class="header">
      <hr />
      <div class="info">
        <span>${title}</span>
        <span class="pageNumber"></span>
      </div>
    </div>
    `,
        footerTemplate: `
    <style>
      footer {
        display: flex;
        justify-content: flex-end;
        width: 100%;
        height: 80px;
        padding-inline: .5in;
      }

      .logo {
        content: url("${logoDataUrl}");
        width: 150px;
        object-fit: contain;
      }
    </style>
    <footer>
      <span class="logo"></span>
    </footer>
    `,
      })
    );
  }

  await browser.close();
  console.log("Done, now merging pdf's");

  const finalPdf = await PDFDocument.create();
  for (const pdf of pdfBlocks) {
    const doc = await PDFDocument.load(pdf);
    const pages = await finalPdf.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => finalPdf.addPage(p));
  }
  const pdfBytes = await finalPdf.save();
  console.log("Final pdf completed");

  return {
    statusCode: 200,
    isBase64Encoded: true,
    body: Buffer.from(pdfBytes).toString("base64"),
    headers: {
      "Content-Type": "application/pdf",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  };

  // const data = ReportDto.parse(JSON.parse(req.body));

  // try {
  //   const browser = await puppeteer.launch({
  //     args: [
  //       ...(process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args),
  //       "--disable-web-security",
  //     ],
  //     defaultViewport: chromium.defaultViewport,
  //     executablePath: process.env.IS_LOCAL
  //       ? "/tmp/localChromium/chromium/linux-1122391/chrome-linux/chrome"
  //       : process.env.CHROME_EXECUTABLE_PATH ||
  //         (await chromium.executablePath()),
  //     headless: process.env.IS_LOCAL ? false : chromium.headless,
  //   });

  //   const page = await browser.newPage();
  //   await page.setBypassCSP(true);
  //   await page.emulateMediaType("print");
  //   await page.setContent(html, {
  //     waitUntil: ["domcontentloaded", "load", "networkidle0"],
  //   });

  //   const pdf = await page.pdf({
  //     format: "A4",
  //     preferCSSPageSize: true,
  //     displayHeaderFooter: true,
  //     headerTemplate: "&nbsp;",
  //     footerTemplate: ``,
  //   });

  //   await browser.close();

  //   const pdfBuffer = Buffer.from(pdf);

  //   return {
  //     statusCode: 200,
  //     isBase64Encoded: true,
  //     body: pdfBuffer.toString("base64"),
  //     headers: {
  //       "Content-Type": "application/pdf",
  //       "Access-Control-Allow-Origin": "*",
  //     },
  //   };
  // } catch (error) {
  //   console.error(error);
  //   return {
  //     statusCode: 500,
  //     body: JSON.stringify({ error }),
  //   };
  // }
};
