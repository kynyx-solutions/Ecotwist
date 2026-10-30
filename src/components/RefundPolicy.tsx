import PolicyLayout, { PolicySection } from "./PolicyLayout";
import { Link } from "react-router-dom";
import content from "../content/pages/refund-policy.json";

const {
  header, companyDetails, commitment, rightToReturn, sections,
  returnProcess, refundProcedure, cancellation, contact, disclaimer,
} = content;

export default function RefundPolicy() {
  return (
    <PolicyLayout
      topLabel={header.topLabel}
      title={header.title}
      effectiveDate={header.effectiveDate}
    >
      <span className="pol-label">{companyDetails.registeredAddressLabel}</span>
      <p>{companyDetails.registeredAddress}</p>
      <span className="pol-label">{companyDetails.officeAddressLabel}</span>
      <p>{companyDetails.officeAddress}</p>
      <div className="pol-inline">
        <span><strong>{companyDetails.cinLabel}</strong> {companyDetails.cin}</span>
        <span>
          <strong>{companyDetails.websiteLabel}</strong>{" "}
          <Link to="/" className="text-blue-600 underline">
            {companyDetails.websiteText}
          </Link>
        </span>
      </div>

      <PolicySection section={commitment} />

      <h2>{rightToReturn.heading}</h2>
      <p>
        {rightToReturn.text} <strong>{rightToReturn.textHighlight}</strong> {rightToReturn.textEnd}
      </p>
      <ul>
        {rightToReturn.points.map((point, i) => <li key={i}>{point}</li>)}
      </ul>

      {sections.map((section, i) => (
        <PolicySection key={i} section={section} />
      ))}

      <h2>{returnProcess.heading}</h2>
      <ol>
        {returnProcess.steps.map((step, i) => (
          <li key={i}>
            <strong>{step.label}</strong> {step.text}{"email" in step && step.email && (
              <> <a
          href={`mailto:${step.email}`}
          onClick={(e) => {
            if (!navigator.userAgent.includes("Mobile")) {
              window.open(`https://mail.google.com/mail/?view=cm&to=${step.email}`);
            }
          }}
          className="text-blue-600 underline"
        >
          {step.email}
        </a> {step.textAfterEmail}</>
            )}
          </li>
        ))}
      </ol>

      <PolicySection section={refundProcedure} />

      <h2>{cancellation.heading}</h2>
      <p>
        {cancellation.text} <a
          href={`mailto:${cancellation.email}`}
          onClick={(e) => {
            if (!navigator.userAgent.includes("Mobile")) {
              window.open(`https://mail.google.com/mail/?view=cm&to=${cancellation.email}`);
            }
          }}
          className="text-blue-600 underline"
        >
          {cancellation.email}
        </a> {cancellation.textEnd}
      </p>

      <h2>{contact.heading}</h2>
      <p>
        {contact.emailLabel}{" "}
        <a
          href={`mailto:${contact.email}`}
          onClick={(e) => {
            if (!navigator.userAgent.includes("Mobile")) {
              window.open(`https://mail.google.com/mail/?view=cm&to=${contact.email}`);
            }
          }}
          className="text-blue-600 underline"
        >
          {contact.email}
        </a>
      </p>
      <p style={{ marginTop: "16px", fontSize: "13px", color: "#555", fontStyle: "italic" }}>
        {disclaimer}
      </p>
    </PolicyLayout>
  );
}
