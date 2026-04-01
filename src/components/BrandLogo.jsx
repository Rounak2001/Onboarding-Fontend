import taxplanAdvisorLogo from '../assets/TAXPLAN.png';

const BrandLogo = ({ height = 34, alt = 'Taxplan Advisor' }) => (
    <a
        href="https://taxplanadvisor.in"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
    >
        <img
            src={taxplanAdvisorLogo}
            alt={alt}
            style={{
                height,
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
            }}
        />
    </a>
);

export default BrandLogo;
