import chromium from "@sparticuz/chromium";
import "dotenv/config";
import {Edge} from "edge.js";
import puppeteer from "puppeteer-core";
import {z} from "zod";
import {sdgs} from "./sdgs";

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
    bmc: z.object({
        keyPartner: z.string(),
        keyActivity: z.string(),
        keyResource: z.string(),
        valueProposition: z.string(),
        customerRelationship: z.string(),
        channel: z.string(),
        customerSegment: z.string(),
        costStructure: z.string(),
        revenueStream: z.string(),
    }),
    organization: z.object({
        name: z.string(),
        description: z.string(),
        address: z.string(),
        logo: z.string(),
    }),
});

// Note: Netlify deploys this function at the endpoint /.netlify/functions/report
export const handler = async (req) => {
    if (req.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        };
    }

    if (!req.body) {
        return {
            statusCode: 400,
            body: "Need to have a body",
        };
    }

    const data = ReportDto.parse(JSON.parse(req.body));

    const edge = Edge.create();
    edge.mount(`${__dirname}/../../../views`);
    const html = await edge.render("pdf", {
        ...data,
        sdgs: data.sdgs.map((sdg) => ({...sdg, sdg: sdgs[sdg.sdg]})),
    });

    // return {
    //     statusCode: 200,
    //     body: html,
    //     headers: {
    //         "Content-Type": "text/html",
    //     },
    // };

    try {
        const browser = await puppeteer.launch({
            args: [
                ...(process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args),
                "--disable-web-security",
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: process.env.IS_LOCAL
                ? "/tmp/localChromium/chromium/linux-1122391/chrome-linux/chrome"
                : process.env.CHROME_EXECUTABLE_PATH ||
                (await chromium.executablePath()),
            headless: process.env.IS_LOCAL ? false : chromium.headless,
        });

        const page = await browser.newPage();
        await page.setBypassCSP(true);
        await page.emulateMediaType('print');
        await page.setContent(html, {
            waitUntil: ["domcontentloaded", "load", "networkidle0"],
        });

        const pdf = await page.pdf({
            format: "A4",
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: "&nbsp;",
            footerTemplate: `
      <style>
      footer {
        margin: 0;
        padding-block: 0;
        padding-inline: 32px;
        font-size: 12px;
        display: flex;
        align-items: center;
        width: 100%;
        justify-content: flex-end;
      }
      a {
        padding-inline-start: 8px;
      }

      svg {
        width: 100px;
      }
      </style>
      <footer>
          Rapportage door
          <a href="https://groeneotter.nl">
            <svg viewBox="0 0 83.079 28.575" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><g style="display:inline;opacity:1"><path style="color:#000;display:inline;opacity:1;fill:#039a3d;fill-opacity:1;stroke-linecap:round;stroke-linejoin:bevel;-inkscape-stroke:none" d="M101.818 63.275c-4.51.062-5.099 2.877-7.303 2.972-2.204.095-3.847-1.498-5.424 1.052-1.013 1.64-.479 3.592.49 4.988.776 1.12 1.21 2.603.675 3.871a16.073 16.073 0 0 0-1.253 6.207C90.235 93.778 96.48 95.923 99.24 96.76c2.76.838 2.52 1.476 3.909 2.076 1.39.6 2.721.213 9.65-2.37s7.316-3.46 8.821-10.583c1.505-7.122.305-7.783-.514-9.725-.535-1.268-.1-2.752.676-3.871.968-1.396 1.5-3.348.487-4.988-1.576-2.55-3.22-.957-5.424-1.052-2.204-.095-2.791-2.91-7.3-2.972-1.374-.02-2.502.177-3.434.55a1.316 1.316 0 0 1-.86 0c-.933-.373-2.061-.57-3.434-.55z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="display:inline;opacity:1;fill:#fff;stroke-width:.745331;stroke-linecap:round;stroke-linejoin:bevel" d="M112.02 93.472c-.33 2.9-3.248 5.445-6.825 5.445-3.578 0-6.065-3.454-6.048-5.329.016-1.874 2.553-4.535 6.13-4.535 3.578 0 7.074 1.52 6.743 4.42z" transform="translate(-64.57 -48.327) scale(.77137)"/><path d="M121.792 72.273c-.52-.166-1.328-.058-2.173.188-1.259.366-2.823 2.738-7.172 4.423-1.872.725-4.54 1.189-6.824 1.221-2.284-.032-4.822-.496-6.694-1.22-4.349-1.686-6.111-4.058-7.37-4.424-.63-.184-1.242-.294-1.729-.27-.102.006-.195.02-.285.038.013.018.023.04.036.058.776 1.12 1.21 2.603.676 3.871a15.97 15.97 0 0 0-1.104 4.062c.385 1.43.951 2.833 1.738 4.013 3.217 4.826 7.301 6.136 14.675 6.142h.045c7.374-.006 11.46-1.316 14.676-6.142.965-1.448 1.6-3.23 1.97-4.987-.198-1.407-.724-2.078-1.15-3.088-.535-1.268-.1-2.752.676-3.871l.009-.014z" style="display:inline;opacity:1;fill:#fff;stroke:#000;stroke-width:.745331;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="color:#000;display:inline;opacity:1;fill:#000;stroke-linecap:round;stroke-linejoin:bevel;-inkscape-stroke:none" d="M101.81 62.807c-2.351.032-3.762.815-4.785 1.564-1.022.75-1.625 1.371-2.53 1.41-.986.043-1.903-.319-2.891-.394-.495-.038-1.02.01-1.524.27-.503.258-.962.709-1.387 1.396-1.139 1.843-.534 4.002.504 5.5.713 1.028 1.078 2.36.63 3.424a16.54 16.54 0 0 0-1.292 6.388l.002.051c.625 5.787 2.539 9.295 4.68 11.443 2.14 2.149 4.496 2.926 5.889 3.348 1.344.408 1.902.743 2.326 1.057.424.314.774.674 1.533 1.002.778.336 1.628.387 3.047.03 1.419-.355 3.484-1.1 6.95-2.392 3.479-1.296 5.402-2.185 6.647-3.734 1.245-1.55 1.716-3.624 2.47-7.19.757-3.588.848-5.588.618-6.978-.23-1.39-.775-2.112-1.16-3.025-.449-1.065-.084-2.396.63-3.424 1.038-1.498 1.64-3.657.501-5.5-.425-.687-.884-1.138-1.387-1.397-.503-.258-1.029-.307-1.523-.27-.989.076-1.906.438-2.89.395-.906-.039-1.51-.66-2.532-1.41-1.022-.75-2.432-1.532-4.783-1.564-1.421-.02-2.615.184-3.615.584-.086.034-.427.034-.512 0-1-.4-2.194-.604-3.615-.584zm.014.935c1.325-.018 2.39.17 3.254.516.397.158.81.158 1.207 0 .865-.346 1.929-.534 3.254-.516 2.158.03 3.294.686 4.244 1.383.95.697 1.744 1.534 3.043 1.59 1.22.052 2.226-.337 3.004-.397.39-.03.706.007 1.024.17.317.163.656.469 1.02 1.057.887 1.436.422 3.18-.476 4.475-.84 1.211-1.343 2.848-.722 4.32.434 1.029.898 1.608 1.097 2.814.2 1.207.138 3.1-.609 6.633-.752 3.557-1.226 5.481-2.283 6.797-1.057 1.316-2.793 2.157-6.244 3.443-3.463 1.291-5.527 2.03-6.854 2.364-1.326.333-1.838.28-2.449.015-.63-.272-.853-.53-1.346-.894-.492-.365-1.196-.77-2.611-1.2-1.368-.414-3.518-1.126-5.498-3.113-1.976-1.982-3.795-5.248-4.406-10.851.006-2.082.422-4.13 1.215-6.008.62-1.472.117-3.109-.723-4.32-.898-1.295-1.364-3.04-.477-4.475.364-.588.703-.894 1.02-1.057.317-.163.634-.2 1.023-.17.778.06 1.785.45 3.004.397 1.299-.056 2.092-.893 3.043-1.59.951-.697 2.089-1.353 4.246-1.383z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;fill-opacity:1;stroke-width:1.57852;stroke-linecap:round;stroke-linejoin:bevel" d="M90.8 72.045c-.176-.027-1.258-1.018-1.402-2.155-.144-1.138.847-2.342 1.06-2.358.102-.007.725.453 1.328.914.637.487 1.252.98 1.263 1.114.01.127-.483.76-1.007 1.335-.558.612-1.152 1.164-1.242 1.15zm27.813 0c.176-.027 1.257-1.018 1.401-2.155.144-1.138-.847-2.342-1.059-2.358-.102-.007-.725.453-1.328.914-.637.487-1.253.98-1.263 1.114-.01.127.483.76 1.007 1.335.557.612 1.151 1.164 1.242 1.15z" transform="translate(-68.148 -51.414) scale(.8127)"/><path style="color:#000;display:inline;opacity:1;fill:#7bff95;fill-opacity:1;stroke-width:1.00494;stroke-linecap:round;stroke-linejoin:bevel;-inkscape-stroke:none" d="M103.722 75.505c-.122 2.476-2.538 5.127-4.805 5.483-2.268.355-4.624.063-6.106-2.075-1.482-2.138-1.172-5.955-.527-6.773.645-.817 2.755-.455 5.282-.455 2.042 0 4.883.877 5.834 2.52.226.39.345.824.322 1.3zm3.694 0c.122 2.476 2.538 5.127 4.805 5.483 2.268.355 4.624.063 6.106-2.075 1.482-2.138 1.172-5.955.527-6.773-.646-.817-2.755-.455-5.283-.455-2.042 0-4.882.877-5.833 2.52-.226.39-.345.824-.322 1.3z" transform="translate(-64.57 -48.327) scale(.77137)"/><path d="M102.649 73.735c-2.32 2.552-5.374 5.884-5.431 5.789-.06-.099 2.908-3.599 5.054-6.11l-2.37-2.027s-2.043 1.821-3.296 3.239c-1.253 1.418-3.186 4.547-3.186 4.547l4.734 2.394s2.54-.907 3.827-2.37c1.286-1.462 2.366-4.01 2.366-4.01zm16.232.188c-2.32 2.552-5.373 5.885-5.43 5.79-.06-.1 3.37-4.095 5.517-6.608l-1.94-1.686s-2.668 1.673-4.19 3.395c-1.522 1.722-3.186 4.548-3.186 4.548l4.834 2.046s1.852-.788 3.138-2.25c1.286-1.463 1.746-3.698 1.746-3.698z" style="display:inline;opacity:1;fill:#01300e;fill-opacity:1;stroke-width:1.45324;stroke-linecap:round;stroke-linejoin:bevel" transform="translate(-64.57 -48.327) scale(.77137)"/><path d="M94.268 70.969c-.485.006-.928.035-1.338.136-.41.102-.816.288-1.1.647-.3.38-.42.825-.527 1.383a9.358 9.358 0 0 0-.147 1.916c.029 1.404.32 2.993 1.174 4.226a5.544 5.544 0 0 0 3.11 2.223c1.179.33 2.42.306 3.61.12 1.342-.21 2.605-1.05 3.585-2.153.248-.28 1.515-1.781 1.728-3.525.046-.377.335-.684.716-.68l1.024.012c.355.004.633.296.678.648.103.794.472 2.138 1.72 3.545.98 1.103 2.243 1.942 3.585 2.152 1.19.187 2.432.21 3.61-.12a5.548 5.548 0 0 0 3.112-2.222c.855-1.233 1.145-2.822 1.174-4.226a9.355 9.355 0 0 0-.148-1.916c-.107-.558-.226-1.003-.526-1.383-.284-.36-.69-.545-1.1-.647-.41-.101-.853-.13-1.338-.136-.97-.012-2.114.078-3.34.078a10.036 10.036 0 0 0-4.008.88c-.425.194-1.129.39-1.597.385l-4.646-.044c-.566-.006-1.422-.245-1.945-.463a10.036 10.036 0 0 0-3.73-.758c-1.225 0-2.367-.09-3.337-.078zm.015 1.322c.87-.01 2.033.078 3.322.078.922 0 2.075.207 3.069.596.994.39 1.808.967 2.164 1.582.169.292.25.587.232.93-.05 1.029-.606 2.193-1.423 3.113-.818.92-1.884 1.577-2.8 1.72-1.066.167-2.124.176-3.05-.083-.927-.26-1.73-.763-2.381-1.704-.62-.894-.912-2.268-.937-3.498a8.154 8.154 0 0 1 .125-1.642c.086-.45.244-.786.265-.813.037-.047.135-.121.377-.181s.603-.092 1.037-.098zm22.57 0c.435.006.795.038 1.037.098.243.06.343.134.38.181.021.027.18.363.265.813.086.45.136 1.027.123 1.642-.025 1.23-.317 2.604-.938 3.498-.651.94-1.452 1.445-2.378 1.704-.927.259-1.985.25-3.051.083-.915-.143-1.982-.8-2.799-1.72-.817-.92-1.373-2.084-1.424-3.113a1.623 1.623 0 0 1 .23-.93c.356-.615 1.171-1.193 2.165-1.582.994-.39 2.147-.596 3.068-.596 1.29 0 2.453-.089 3.322-.078z" style="display:inline;opacity:1;stroke-linecap:round;stroke-linejoin:bevel" transform="translate(-64.57 -48.327) scale(.77137)"/><path d="M105.139 78.766c-1.056 0-2.639.195-3.117.566-.692.537-.966 1.54-.35 2.881.616 1.341 3.15 1.182 3.436 1.593.288.412.21.717.207.999-.004.281-.174.905-.626 1.34-.445.429-1.215.79-2.04.974-.826.184-1.706.19-2.356-.025-1.4-.462-2.34-1.923-2.614-3.02-.124-.499-.018-1.307.137-1.968.156-.662.346-1.18.346-1.18a.265.265 0 0 0-.496-.184s-.202.546-.365 1.242c-.163.696-.304 1.539-.135 2.217.314 1.259 1.323 2.856 2.963 3.397.783.258 1.735.238 2.633.039a5.785 5.785 0 0 0 1.538-.568c.215-.12.575-.236.82-.236h.959c.245 0 .606.117.82.236a5.8 5.8 0 0 0 1.538.568c.899.2 1.853.219 2.635-.04 1.64-.54 2.648-2.137 2.962-3.396.168-.678.028-1.521-.135-2.217a11.78 11.78 0 0 0-.364-1.242.265.265 0 0 0-.498.184s.19.518.346 1.18c.155.661.261 1.47.137 1.968-.273 1.097-1.214 2.558-2.613 3.02-.65.214-1.529.209-2.354.025-.826-.183-1.597-.545-2.043-.974-.451-.435-.604-1.106-.625-1.34-.021-.234-.122-.656.111-.993.234-.336 2.804-.242 3.426-1.58.622-1.338.351-2.344-.338-2.884-.545-.427-2.533-.629-3.53-.57a6.687 6.687 0 0 0-.415-.012z" style="opacity:1;stroke-width:1.32292;stroke-linecap:round;stroke-linejoin:bevel" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.635503;stroke-linecap:round;stroke-linejoin:bevel" d="m92.84 93.115 1.952.881s-.74-1.095-.976-1.589c-.238-.494-.635-1.49-.635-1.49s-.199.892-.249 1.247c-.05.356-.091.951-.091.951zm2.34 2.028 2.275.832s-.864-.831-1.2-1.407c-.337-.577-.759-1.697-.759-1.697s-.232.925-.281 1.28c-.05.356-.034.992-.034.992z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.635503;stroke-linecap:round;stroke-linejoin:bevel" d="m97.417 96.256 2.141.204s-.625-.276-1.087-.818c-.462-.54-.732-1.453-.732-1.453s-.31.947-.308 1.528c.001.581-.014.54-.014.54z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.702563;stroke-linecap:round;stroke-linejoin:bevel" d="m118.347 93.68-3.734 1.843s1.832-1.725 2.169-2.234c.337-.51 1.225-2.295 1.225-2.295s.199 1.09.249 1.524c.05.435.091 1.162.091 1.162z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.635503;stroke-linecap:round;stroke-linejoin:bevel" d="m116.007 95.127-2.63.92s.992-1.007 1.38-1.525c.39-.518.935-1.667.935-1.667s.232.924.281 1.28c.05.355.034.992.034.992z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.635503;stroke-linecap:round;stroke-linejoin:bevel" d="m113.77 96.24-2.87.52s1.103-.54 1.618-1.064c.515-.524 1.095-1.471 1.095-1.471s.145.894.144 1.476c-.001.58.014.539.014.539z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.347 83.437a33.935 33.935 0 0 1 15.587.204" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.269 84.035a28.066 28.066 0 0 1 14.805 1.393" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.261 84.562a24.488 24.488 0 0 1 6.61-.16c2.123.238 4.253.771 6.053 1.918a9.9 9.9 0 0 1 1.654 1.323" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.174 85.073a15.94 15.94 0 0 1 10.733 3.066c.696.519 1.35 1.094 1.951 1.72M110.86 85.99a9.008 9.008 0 0 1 5.49 4.233 8.922 8.922 0 0 1 1.059 3.109" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.08 85.554a14.9 14.9 0 0 1 5.601 1.957c1.196.712 2.296 1.6 3.175 2.679a9.976 9.976 0 0 1 1.29 2.05" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.347 83.437a33.935 33.935 0 0 1 15.587.204" transform="matrix(-.77137 0 0 .77137 98.147 -48.327)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.269 84.035a28.066 28.066 0 0 1 14.805 1.393" transform="matrix(-.77137 0 0 .77137 98.147 -48.327)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.261 84.562a24.488 24.488 0 0 1 6.61-.16c2.123.238 4.253.771 6.053 1.918a9.9 9.9 0 0 1 1.654 1.323" transform="matrix(-.77137 0 0 .77137 98.147 -48.327)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.174 85.073a15.94 15.94 0 0 1 10.733 3.066c.696.519 1.35 1.094 1.951 1.72M110.86 85.99a9.008 9.008 0 0 1 5.49 4.233 8.922 8.922 0 0 1 1.059 3.109" transform="matrix(-.77137 0 0 .77137 98.147 -48.327)"/><path style="fill:none;stroke:#000;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M111.08 85.554a14.9 14.9 0 0 1 5.601 1.957c1.196.712 2.296 1.6 3.175 2.679a9.976 9.976 0 0 1 1.29 2.05" transform="matrix(-.77137 0 0 .77137 98.147 -48.327)"/><path style="opacity:1;fill:#000;fill-opacity:1;stroke:none;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M102.644 63.843c.572.155 1.763.831 1.763.831s-.686-1.04-1.413-1.107c-.866-.078-.792-.27-1.634-.05 0 0 .713.172 1.284.326z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.635503;stroke-linecap:round;stroke-linejoin:bevel" d="m110.301 97.705-2.493.195s1.081-.488 1.956-.938c.874-.449 1.47-1.276 1.47-1.276s-.388 1.17-.484 1.743zm-9.425-.198 1.03-.004s-.269-.249-.923-.722c-.653-.474-1.312-1.394-1.312-1.394s.346.94.442 1.512z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;fill-opacity:1;stroke:none;stroke-width:.265112;stroke-linecap:round;stroke-linejoin:bevel;stroke-dasharray:none;stroke-opacity:1" d="M122.122 77.35c.238.7 1.17 2.297 1.17 2.297s-.855-.426-1-.056zm-32.669.327c-.238.7-1.17 2.297-1.17 2.297s.855-.425 1-.056zm19.213-13.81c-.572.154-1.763.83-1.763.83s.686-1.04 1.413-1.106c.866-.078.792-.27 1.634-.05 0 0-.712.171-1.284.326z" transform="translate(-64.57 -48.327) scale(.77137)"/><path style="opacity:1;fill:#000;stroke-width:.290075;stroke-linecap:round;stroke-linejoin:bevel" d="M92.022 71.55s-.858-.015-1.394.082c-.536.098-.953.54-.953.54l.678 2.042 1.29 2.28zm27.128 0s.858-.015 1.394.082c.536.098.953.54.953.54l-.677 2.042-1.29 2.28z" transform="translate(-64.57 -48.327) scale(.77137)"/><path d="M41.479 6.142q-.248-.457-.718-.692-.457-.248-1.084-.248-1.083 0-1.736.718-.652.705-.652 1.892 0 1.266.679 1.984.691.705 1.892.705.823 0 1.384-.417.574-.418.835-1.201h-2.832V7.238h4.855v2.075q-.248.836-.848 1.554-.587.718-1.501 1.161-.914.444-2.062.444-1.358 0-2.428-.587-1.058-.6-1.658-1.658-.587-1.057-.587-2.415 0-1.357.587-2.414.6-1.07 1.658-1.658 1.057-.6 2.414-.6 1.645 0 2.768.796 1.135.796 1.5 2.206zm6.095.195q.392-.6.98-.94.587-.352 1.304-.352v2.363h-.613q-.835 0-1.253.365-.418.353-.418 1.253v3.38h-2.232V5.125h2.232zm6.67 6.174q-1.07 0-1.932-.457-.848-.456-1.344-1.305-.483-.848-.483-1.984 0-1.122.496-1.97.496-.862 1.357-1.319.862-.457 1.932-.457 1.07 0 1.932.457.862.457 1.358 1.318.496.849.496 1.971 0 1.123-.51 1.984-.496.849-1.37 1.305-.862.457-1.932.457zm0-1.931q.64 0 1.084-.47.456-.47.456-1.345 0-.874-.443-1.344-.431-.47-1.07-.47-.653 0-1.084.47-.43.457-.43 1.344 0 .875.417 1.345.43.47 1.07.47zM66.11 8.648q0 .313-.04.652h-5.05q.052.68.43 1.045.392.352.953.352.835 0 1.162-.705h2.375q-.182.718-.665 1.292-.47.575-1.188.901-.718.326-1.606.326-1.07 0-1.905-.457-.836-.456-1.306-1.305-.47-.848-.47-1.984 0-1.135.457-1.984.47-.848 1.306-1.305.835-.457 1.918-.457 1.058 0 1.88.444.822.444 1.28 1.266.469.822.469 1.919zm-2.284-.588q0-.574-.392-.913-.391-.34-.979-.34-.561 0-.953.327-.378.326-.47.926zm7.897-3.015q1.279 0 2.036.836.77.822.77 2.27v4.256h-2.22V8.452q0-.731-.378-1.136-.378-.404-1.018-.404t-1.018.404q-.378.405-.378 1.136v3.955h-2.232V5.124h2.232v.965q.339-.483.913-.757.575-.287 1.293-.287Zm11.225 3.603q0 .313-.04.652h-5.05q.051.68.43 1.045.392.352.953.352.835 0 1.162-.705h2.375q-.183.718-.666 1.292-.47.575-1.187.901-.718.326-1.606.326-1.07 0-1.906-.457-.835-.456-1.305-1.305-.47-.848-.47-1.984 0-1.135.457-1.984.47-.848 1.305-1.305.836-.457 1.92-.457 1.056 0 1.879.444.822.444 1.279 1.266.47.822.47 1.919zm-2.284-.588q0-.574-.392-.913-.392-.34-.979-.34-.561 0-.953.327-.378.326-.47.926zM46.85 25.422q-1.292 0-2.376-.6-1.07-.6-1.71-1.67-.626-1.084-.626-2.429 0-1.344.626-2.414.64-1.07 1.71-1.671 1.084-.6 2.376-.6 1.292 0 2.362.6 1.084.6 1.697 1.67.627 1.071.627 2.415 0 1.345-.627 2.428-.626 1.07-1.697 1.671-1.07.6-2.362.6zm0-2.036q1.096 0 1.749-.73.666-.732.666-1.933 0-1.213-.666-1.931-.653-.731-1.75-.731-1.109 0-1.774.718-.653.717-.653 1.944 0 1.214.653 1.945.665.718 1.775.718zm9.985.052v1.893H55.7q-1.214 0-1.893-.587-.679-.6-.679-1.945V19.9h-.887v-1.853h.887v-1.775h2.232v1.775h1.462V19.9H55.36v2.924q0 .326.157.47.156.143.522.143zm5.3 0v1.893h-1.136q-1.214 0-1.893-.587-.678-.6-.678-1.945V19.9h-.888v-1.853h.888v-1.775h2.231v1.775h1.462V19.9H60.66v2.924q0 .326.157.47.157.143.522.143zm8.105-1.866q0 .313-.04.652h-5.05q.052.68.43 1.045.392.352.953.352.836 0 1.162-.705h2.375q-.182.718-.665 1.292-.47.575-1.188.901-.718.326-1.606.326-1.07 0-1.905-.456-.836-.457-1.305-1.306-.47-.848-.47-1.984 0-1.135.456-1.984.47-.848 1.306-1.305.835-.457 1.918-.457 1.058 0 1.88.444.822.444 1.28 1.266.47.822.47 1.919zm-2.284-.588q0-.574-.392-.913-.391-.34-.979-.34-.56 0-.952.327-.379.326-.47.926zm5.69-1.722q.392-.6.98-.94.587-.353 1.305-.353v2.363h-.613q-.836 0-1.253.365-.418.353-.418 1.253v3.381h-2.232v-7.283h2.232z" style="font-weight:700;font-size:13.0526px;font-family:Poppins;-inkscape-font-specification:'Poppins Bold';text-align:center;letter-spacing:0;word-spacing:0;text-anchor:middle;stroke-width:3.10626;stroke-linecap:round;stroke-linejoin:bevel" aria-label="Groene Otter"/></g></svg>
          </a>
      </footer>`,
        });

        await browser.close();

        const pdfBuffer = Buffer.from(pdf);

        return {
            statusCode: 200,
            isBase64Encoded: true,
            body: pdfBuffer.toString("base64"),
            headers: {
                "Content-Type": "application/pdf",
                "Access-Control-Allow-Origin": "*",
            },
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({error}),
        };
    }
};
