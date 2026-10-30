import PolicyLayout, { PolicySection } from "./PolicyLayout";
import { Link } from "react-router-dom";
import content from "../content/pages/terms-of-service.json";

const { header, companyDetails, sections, contact } = content;

export default function TermsOfService() {
  return (
    <PolicyLayout
      topLabel={header.topLabel}
      title={header.title}
      company={header.company}
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

      {sections.map((section, i) => (
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
      </p>    </PolicyLayout>
  );
}
