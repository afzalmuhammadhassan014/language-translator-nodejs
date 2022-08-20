import React from "react";
import PropTypes from "prop-types";
import {
  Navbar,
  Nav,
  NavItem,
  NavDropdown,
  MenuItem,
  Form,
  FormControl,
  Button,
  Dropdown,
  DropdownButton,
  ButtonGroup,
} from "react-bootstrap";

// eslint-disable-next-line
const DESCRIPTION =
  "This web app demonstrates AI Infinity Speech to Text, Language Translator and Text to Speech.";

function Layout(props) {
  const { children } = props;
  return (
    <html lang="en">
      <head>
        <title>AI Infinity Speech Recognition</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="og:title" content="Speech Translator with Watson" />
        <meta name="og:description" content={DESCRIPTION} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/images/apple-icon-180x180.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/images/android-icon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="/images/favicon-96x96.png"
        />
        <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
        <link rel="stylesheet" href="/css/watson-react-components.min.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/bootstrap.min.css" />
      </head>
      <header>
        <Navbar bg="light" expand="lg">
          <Navbar.Brand href="/speech_translation">
            <img
              src="/images/logo.png"
              className="d-inline-block align-top"
              alt="React Bootstrap logo"
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
              <Nav.Link href="/speech_translation">Sound Recognition</Nav.Link>
              <Nav.Link href="/text-translation">Text Translation</Nav.Link>
              <Nav.Link href="/text-to-speech">Text Uttarance</Nav.Link>
            </Nav>
            {["Logout"].map((variant) => (
              <DropdownButton
                as={ButtonGroup}
                key={variant}
                id={`dropdown-variants-${variant}`}
                variant={variant.toLowerCase()}
                title={variant}
              >
                <Dropdown.Item eventKey={1}>Action</Dropdown.Item>
                <Dropdown.Item eventKey={2}>Another action</Dropdown.Item>
                <Dropdown.Item eventKey={3}>active> Active Item</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item eventKey={4}>Separated link</Dropdown.Item>
              </DropdownButton>
            ))}
          </Navbar.Collapse>
        </Navbar>
      </header>
      <body>
        <div id="root">{children}</div>
        <script type="text/javascript" src="js/bundle.js" />
      </body>
      <footer className="footer mt-auto py-3 bg-dark text-white">
        <div class="flex text-gray-500 uppercase text-sm">
          <a href="#" class="mr-2 hover:text-indigo-600">
            Home
          </a>
          <a href="#" class="mr-2 hover:text-indigo-600">
            About Us
          </a>
          <a href="#" class="mr-2 hover:text-indigo-600">
            Contact Us
          </a>
          <a href="#" class="mr-2 hover:text-indigo-600">
            Support Us
          </a>
        </div>
      </footer>
    </html>
  );
}
Layout.propTypes = {
  children: PropTypes.object.isRequired, // eslint-disable-line
};

export default Layout;
