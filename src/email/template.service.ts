import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as mjml2html from 'mjml';

type Ctx = Record<string, unknown>;

@Injectable()
export class EmailTemplateService {
  private readonly baseDir = './src/emailTemplates';
  private layoutTpl?: Handlebars.TemplateDelegate;
  private readonly initialization: Promise<void>;

  constructor() {
    this.initialization = this.initialize();
  }

  private async initialize() {
    const partialsDir = path.join(this.baseDir, 'components');

    const entries = await fs.readdir(partialsDir);

    for (const file of entries) {
      if (!file.endsWith('.mjml')) {
        continue;
      }

      const name = `components/${path.basename(file, '.mjml')}`;

      const src = await fs.readFile(path.join(partialsDir, file), 'utf8');

      Handlebars.registerPartial(name, src);
    }

    Handlebars.registerHelper('eq', (a, b) => a === b);

    Handlebars.registerHelper('and', function (...args) {
      return args.slice(0, -1).every(Boolean);
    });
  }

  async render({ templateName, layout = 'mainDefault' }: { templateName: string; layout?: string }, ctx: Ctx) {
    await this.initialization;

    const childSrc = await fs.readFile(path.join('./src/emailTemplates', `${templateName}.mjml`), 'utf8');

    const bodyCompiler = Handlebars.compile(childSrc);

    const fullCtx: Ctx = {
      year: new Date().getFullYear(),
      ...ctx,
    };

    const body = bodyCompiler(fullCtx);

    const layoutSrc = await fs.readFile(path.join(this.baseDir, `layouts/${layout}.mjml`), 'utf8');

    const layoutCompiler = Handlebars.compile(layoutSrc, { noEscape: false });

    const layoutHtml = layoutCompiler({ ...fullCtx, body });

    const { html, errors } = (mjml2html as any)(layoutHtml, {
      minify: true,
      filePath: this.baseDir,
    });

    if (errors?.length) {
      const message = errors.map((error) => error.formattedMessage || error.message).join('\n');

      throw new Error(`Email templates compilation failed: ${message}`);
    }

    return html;
  }
}
