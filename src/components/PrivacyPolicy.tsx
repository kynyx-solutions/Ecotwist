import PolicyLayout, { PolicySection } from "./PolicyLayout";
 import { Link } from "react-router-dom";
import content from "../content/pages/privacy-policy.json";

const { header, companyDetails, sections, grievance, closingSections, contact } = content;

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      topLabel={header.topLabel}
      title={header.title}
      effectiveDate={header.effectiveDate}
    >
      <h2>{companyDetails.heading}</h2>
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

      {sections.map((section, i) => (
        <PolicySection key={i} section={section} />
      ))}

      <h2>{grievance.heading}</h2>
      <p>
        <strong>{grievance.name}</strong> — {grievance.role}<br />
        {grievance.emailLabel}{" "}<a
          href={`mailto:${grievance.email}`}
          onClick={(e) => {
            if (!navigator.userAgent.includes("Mobile")) {
              window.open(`https://mail.google.com/mail/?view=cm&to=${grievance.email}`);
            }
          }}
          className="text-blue-600 underline"
        >
          {grievance.email}
        </a><br />
        {grievance.addressLabel} {grievance.address}
      </p>

      {closingSections.map((section, i) => (
        <PolicySection key={i} section={section} />
      ))}

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
       &nbsp;|&nbsp; <strong>{contact.websiteLabel}</strong>{" "}
          <Link to="/" className="text-blue-600 underline">
            {contact.websiteText}
          </Link></p>
    </PolicyLayout>
  );
}
