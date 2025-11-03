import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-section">
          <h3>Sobre</h3>
          <p>Informações sobre a empresa ou site.</p>
        </div>
        <div className="footer-section">
          <h3>Serviços</h3>
          <ul>
            <li>Serviço 1</li>
            <li>Serviço 2</li>
            <li>Serviço 3</li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Contato</h3>
          <p>Email: contato@exemplo.com</p>
          <p>Tel: (11) 1234-5678</p>
        </div>
        <div className="footer-section">
          <h3>Siga-nos</h3>
          <ul>
            <li>Facebook</li>
            <li>Instagram</li>
            <li>Twitter</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

