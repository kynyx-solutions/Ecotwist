import { Fragment, ReactNode } from "react";
import content from "../content/pages/policy-layout.json";

const { layout } = content;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');

  .pol-root {
    max-width: 860px;
    margin: 0 auto;
    margin-top: 48px;
    padding: 48px 40px 80px;
    font-family: 'Inter', sans-serif;
    color: #1a1a1a;
    background: #fff;
  }
  .pol-top-title {
    text-align: center;
    font-style: italic;
    font-size: 15px;
    color: #2d6a4f;
    margin-bottom: 6px;
  }
  .pol-main-title {
    font-style: italic;
    font-size: 22px;
    font-weight: 400;
    color: #2d6a4f;
    margin-bottom: 4px;
  }
  .pol-company {
    font-size: 14px;
    color: #1a1a1a;
    margin-bottom: 2px;
  }
  .pol-effective {
    font-size: 14px;
    color: #1a1a1a;
    margin-bottom: 20px;
  }
  .pol-root h2 {
    font-style: italic;
    font-weight: 600;
    font-size: 15px;
    color: #2d6a4f;
    margin: 22px 0 4px;
  }
  .pol-root h3 {
    font-style: italic;
    font-weight: 600;
    font-size: 14px;
    color: #2d6a4f;
    margin: 14px 0 2px;
  }
  .pol-root p {
    font-size: 14px;
    line-height: 1.75;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  .pol-root ul, .pol-root ol {
    padding-left: 32px;
    margin: 4px 0 8px;
  }
  .pol-root li {
    font-size: 14px;
    line-height: 1.75;
    color: #1a1a1a;
    margin-bottom: 2px;
  }
  .pol-label {
    font-weight: 600;
    color: #2d6a4f;
    font-size: 14px;
    display: block;
    margin-top: 10px;
  }
  .pol-inline {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
    margin: 6px 0;
    font-size: 14px;
  }
  .pol-inline strong { color: #2d6a4f; }
  a { color: inherit; }
  @media (max-width: 600px) {
    .pol-root { padding: 32px 20px 60px; }
  }
`;

interface PolicyLayoutProps {
  topLabel?: string;
  title: string;
  company?: string;
  effectiveDate?: string;
  children: ReactNode;
}

export default function PolicyLayout({
  topLabel,
  title,
  company = layout.defaultCompany,
  effectiveDate,
  children,
}: PolicyLayoutProps) {
  return (
    <div className="pol-root">
      <style>{styles}</style>
      {topLabel && <p className="pol-top-title">{topLabel}</p>}
      <p className="pol-main-title">{title}</p>
      <p className="pol-company">{company}</p>
      {effectiveDate && <p className="pol-effective">{layout.effectiveDateLabel} {effectiveDate}</p>}
      {children}
    </div>
  );
}

/* ============================
   One policy section from the page's JSON (edited in the admin panel):
   <h2> heading, paragraphs, <h3> subsections, a bullet list (plain or with a
   bold label per point), then any closing paragraphs.
============================ */

export interface PolicySectionData {
  heading?: string;
  paragraphs?: string[];
  subsections?: { heading: string; paragraphs?: string[]; points?: string[] }[];
  points?: string[];
  labelledPoints?: { label: string; text: string }[];
  paragraphsAfter?: string[];
}

export function PolicySection({ section }: { section: PolicySectionData }) {
  return (
    <>
      {section.heading && <h2>{section.heading}</h2>}
      {section.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
      {section.subsections?.map((sub, i) => (
        <Fragment key={i}>
          <h3>{sub.heading}</h3>
          {sub.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
          {sub.points && (
            <ul>
              {sub.points.map((point, j) => <li key={j}>{point}</li>)}
            </ul>
          )}
        </Fragment>
      ))}
      {section.points && (
        <ul>
          {section.points.map((point, i) => <li key={i}>{point}</li>)}
        </ul>
      )}
      {section.labelledPoints && (
        <ul>
          {section.labelledPoints.map((point, i) => (
            <li key={i}><strong>{point.label}</strong> {point.text}</li>
          ))}
        </ul>
      )}
      {section.paragraphsAfter?.map((p, i) => <p key={i}>{p}</p>)}
    </>
  );
}
