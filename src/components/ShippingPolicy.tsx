import { Fragment } from "react";
import PolicyLayout, { PolicySection } from "./PolicyLayout";
import content from "../content/pages/shipping-policy.json";

const { header, journey, charges, sections, contact, disclaimer, faq } = content;

export default function ShippingPolicy() {
  return (
    <PolicyLayout
      topLabel={header.topLabel}
      title={header.title}
    >
      <p>{header.intro}</p>

      <PolicySection section={journey} />

      <h2>{charges.heading}</h2>
      <p>
        {charges.text} <strong>{charges.textHighlight}</strong>{charges.textEnd}
      </p>

      {sections.map((section, i) => (
        <PolicySection key={i} section={section} />
      ))}

      <h2>{contact.heading}</h2>
      <p>
        {contact.text}
      </p>
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

      <h2>{disclaimer.heading}</h2>
      <p style={{ fontStyle: "italic", color: "#555" }}>
        {disclaimer.text}
      </p>

      <h2>{faq.heading}</h2>
      {faq.items.map((item, i) => (
        <Fragment key={i}>
          <h3>{item.question}</h3>
          <p>
            {item.answer}{"email" in item && item.email && (
              <> <a
          href={`mailto:${item.email}`}
          onClick={(e) => {
            if (!navigator.userAgent.includes("Mobile")) {
              window.open(`https://mail.google.com/mail/?view=cm&to=${item.email}`);
            }
          }}
          className="text-blue-600 underline"
        >
          {item.email}
        </a>{item.answerAfterEmail}</>
            )}
          </p>
        </Fragment>
      ))}
    </PolicyLayout>
  );
}
