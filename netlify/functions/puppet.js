import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import 'dotenv/config'

const url = 'https://lite.cnn.com/'

chromium.setHeadlessMode = true
chromium.setGraphicsMode = false

export async function handler(event, context) {
    try {
        const browser = await puppeteer.launch({
            args: process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: process.env.IS_LOCAL
                ? "/tmp/localChromium/chromium/linux-1122391/chrome-linux/chrome"
                : process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
            headless: process.env.IS_LOCAL ? false : chromium.headless,
        });

        const page = await browser.newPage()

        await page.goto(url, {
            waitUntil: ['domcontentloaded', 'load', "networkidle0"],
        })

        const pdf = await page.pdf({
            format: 'A4', printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm',
            },
        });

        await browser.close();

        const pdfBuffer = Buffer.from(pdf);

        return {
            statusCode: 200,
            isBase64Encoded: true,
            body: pdfBuffer.toString('base64'),
            headers: {
                'Content-Type': 'application/pdf'
            },
        }
    } catch (error) {
        console.error(error)
        return {
            statusCode: 500,
            body: JSON.stringify({error}),
        }
    }
}
