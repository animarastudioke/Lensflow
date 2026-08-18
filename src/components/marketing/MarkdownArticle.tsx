import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownArticle({ content }: { content: string }) {
  return (
    <div className="space-y-5 text-body text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="pt-4 text-heading-lg font-display font-semibold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-2 text-heading-md font-display font-semibold text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => (
            <Link href={href ?? '#'} className="text-primary hover:underline">
              {children}
            </Link>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-4 italic text-foreground/80">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-body-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-medium text-foreground">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-3 border-t border-border">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
