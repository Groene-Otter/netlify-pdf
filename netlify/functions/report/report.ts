import "dotenv/config";
import puppeteer from "puppeteer-core";

type PageBlock = {
  cover: boolean;
  content: string;
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
    block,
    styles,
    logoDataUrl,
    title,
    headerColor,
  }: {
    block: PageBlock;
    styles: string[];
    logoDataUrl: string;
    title: string;
    headerColor: string;
  } = JSON.parse(req.body);

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://browserless.rienheuver.nl/chrome?token=6PiP6nwE6ewlsw31Ok22MpwPjgb4rvSO`,
  });
  const page = await browser.newPage();

  page.on("error", (error) => console.error(error));

  await page.setContent(block.content);

  const styleTagPromises = [
    page.addStyleTag({
      url: "https://unpkg.com/open-props@1.7.15/open-props.min.css",
    }),
    page.addStyleTag({
      url: "https://unpkg.com/open-props@1.7.15/normalize.light.min.css",
    }),
    page.addStyleTag({
      url: "https://fonts.bunny.net/css?family=poppins:100,400,900",
    }),
    page.addStyleTag({
      url: "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css",
    }),
    page.addStyleTag({
      content: `
        html {
          -webkit-print-color-adjust: exact !important;
          font-size: 14px;
          background: white;
          }
          `,
    }),
    page.addStyleTag({
      content: `
        @page {
          size: a4 landscape;
          padding-block: ${block.cover ? "0" : "1.05in"};
          padding-inline: ${block.cover ? "0" : ".5in"};
        }
      `,
    }),
  ];
  for (const style of styles) {
    styleTagPromises.push(page.addStyleTag({ content: style }));
  }
  await Promise.all(styleTagPromises);
  // For colour usage
  await Promise.all([
    page.waitForNetworkIdle(),
    // page.setBypassCSP(true),
    // page.emulateMediaType('print'),
  ]);
  const pdfBytes = await page.pdf({
    // format: 'A4',
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
        font-size: 14px;
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
  });

  await browser.close();

  console.log("PDF completed");

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
};
