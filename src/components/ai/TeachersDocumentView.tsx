import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";

interface TeachersDocumentViewProps {
  title: string;
  subtitle?: string;
  content: string;
  fileName: string;
}

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: "Times New Roman", Georgia, serif; color: #111; line-height: 1.5; font-size: 12pt; }
  h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: .5px; margin: 0 0 6pt; }
  h2 { font-size: 13pt; text-transform: uppercase; border-bottom: 1.5pt solid #111; padding-bottom: 3pt; margin: 16pt 0 8pt; }
  h3 { font-size: 12pt; margin: 12pt 0 6pt; }
  h4, h5 { font-size: 11.5pt; margin: 10pt 0 4pt; }
  p, li { font-size: 11.5pt; }
  ul, ol { margin: 4pt 0 8pt 18pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; page-break-inside: auto; }
  th, td { border: 1pt solid #111; padding: 5pt 6pt; font-size: 10.5pt; vertical-align: top; text-align: left; }
  th { background: #eceff1; font-weight: bold; text-align: center; }
  tr { page-break-inside: avoid; }
  blockquote { border-left: 3pt solid #999; margin: 8pt 0; padding-left: 10pt; color: #333; }
  hr { border: none; border-top: 1pt solid #999; margin: 12pt 0; }
  code { font-family: "Courier New", monospace; font-size: 10.5pt; }
`;

export function TeachersDocumentView({ title, subtitle, content, fileName }: TeachersDocumentViewProps) {
  const docRef = useRef<HTMLDivElement>(null);

  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const buildHtml = () =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${
      docRef.current?.innerHTML ?? ""
    }</body></html>`;

  const download = () => {
    const blob = new Blob([buildHtml()], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as a Word document");
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copy} title="Copy">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={download} title="Download for Word">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={print} title="Print">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-card p-5 sm:p-8 overflow-x-auto">
          <div ref={docRef} className="deped-doc mx-auto max-w-[820px] text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-center text-lg font-bold uppercase tracking-wide mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-7 mb-3 border-b-2 border-foreground/70 pb-1 text-base font-bold uppercase">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => <h3 className="mt-5 mb-2 text-sm font-bold uppercase">{children}</h3>,
                h4: ({ children }) => <h4 className="mt-4 mb-1.5 text-sm font-semibold">{children}</h4>,
                p: ({ children }) => <p className="my-2">{children}</p>,
                ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                hr: () => <hr className="my-5 border-border" />,
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-4 border-border pl-3 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-4 w-full overflow-x-auto">
                    <table className="w-full border-collapse border border-foreground/60 text-xs">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                th: ({ children }) => (
                  <th className="border border-foreground/60 px-2 py-1.5 text-center font-semibold align-top">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-foreground/60 px-2 py-1.5 align-top">{children}</td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeachersDocumentView;
