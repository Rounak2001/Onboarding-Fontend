import taxplanAdvisorDefaultLogo from '../../assets/TAXPLAN.png';

const AdminBrandLogo = ({ isLight, height = 30, alt = 'Taxplan Advisor', linked = true }) => {
    const logoSrc = isLight ? '/Col_Log_1.png' : taxplanAdvisorDefaultLogo;

    const image = (
        <img
            src={logoSrc}
            alt={alt}
            style={{
                height,
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
            }}
        />
    );

    if (!linked) {
        return image;
    }

    return (
        <a
            href="https://taxplanadvisor.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
        >
            {image}
        </a>
    );
};

export default AdminBrandLogo;
