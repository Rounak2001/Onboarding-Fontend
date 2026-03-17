import taxplanAdvisorLogo from '../assets/TAXPLAN.png';

const BrandLogo = ({ height = 34, alt = 'Taxplan Advisor' }) => (
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
);

export default BrandLogo;
