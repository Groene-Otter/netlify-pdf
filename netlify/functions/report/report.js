import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import 'dotenv/config';
import { z } from 'zod';
import { Edge } from 'edge.js';
import { sdgs } from './sdgs';

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const ReportDto = z.object({
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  risks: z.array(
    z.object({
      risk: z.string(),
      measure: z.string(),
    })
  ),
  opinion: z.object({
    opinion: z.string(),
    references: z.array(
      z.object({
        link: z.string(),
        label: z.string(),
      })
    ),
  }),
  sdgs: z.array(
    z.object({
      sdg: z.number(),
      explanation: z.string(),
    })
  ),
  organization: z.object({
    name: z.string(),
    description: z.string(),
    address: z.string(),
    logo: z.string(),
  }),
});

// Note: Netlify deploys this function at the endpoint /.netlify/functions/report
export const handler = async (req) => {
  if (!req.body) {
    return {
      statusCode: 400,
      body: 'Need to have a body',
    };
  }

  const data = ReportDto.parse(JSON.parse(req.body));

  const edge = Edge.create();
  edge.mount(`${__dirname}/../../../views`);
  const html = await edge.render('pdf', {
    ...data,
    sdgs: data.sdgs.map((sdg) => ({ ...sdg, sdg: sdgs[sdg.sdg] })),
  });

  try {
    const browser = await puppeteer.launch({
      args: [
        ...(process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args),
        '--disable-web-security',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.IS_LOCAL
        ? '/tmp/localChromium/chromium/linux-1122391/chrome-linux/chrome'
        : process.env.CHROME_EXECUTABLE_PATH ||
          (await chromium.executablePath()),
      headless: process.env.IS_LOCAL ? false : chromium.headless,
    });

    const page = await browser.newPage();
    await page.setBypassCSP(true);
    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'load', 'networkidle0'],
    });

    const pdf = await page.pdf({
      format: 'A4',
      footerTemplate: `
      <style>
      footer {
        font-size: 16px;
        padding-inline: 32px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        justify-content: space-between;
      }

      img {
        width: 100px;
      }

      a {
        color: #030507;
        font-weight: bold;
        text-decoration: underline;
      }
      </style>
      <footer>
        <span>
          Dit rapport is opgesteld met de Groene Otter. Voor meer informatie zie:
          <a href="https://groeneotter.nl">https://groeneotter.nl</a>
        </span>
        <img src="data:image/png;base64,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" />
      </footer>`,
      displayHeaderFooter: true,
    });

    await browser.close();

    const pdfBuffer = Buffer.from(pdf);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      body: pdfBuffer.toString('base64'),
      headers: {
        'Content-Type': 'application/pdf',
      },
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
