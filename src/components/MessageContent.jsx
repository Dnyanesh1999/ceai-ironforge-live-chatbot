function renderInlineMarkdown(text, lineKey) {
  const tokens = String(text).split(/(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g);

  return tokens.map((token, tokenIndex) => {
    const key = `${lineKey}-${tokenIndex}`;
    const bold = token.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={key}>{bold[1]}</strong>;

    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a href={link[2]} target="_blank" rel="noreferrer" key={key}>
          {link[1]}
        </a>
      );
    }

    return token;
  });
}

export default function MessageContent({ content }) {
  const blocks = String(content).split("\n");
  return (
    <div className="message-content">
      {blocks.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span className="message-space" key={index} />;
        if (/^[-•*]\s/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-•*]\s*/, "");
          return (
            <p className="message-bullet" key={index}>
              <span aria-hidden="true">—</span>
              <span>{renderInlineMarkdown(bulletText, index)}</span>
            </p>
          );
        }
        return <p key={index}>{renderInlineMarkdown(line, index)}</p>;
      })}
    </div>
  );
}
