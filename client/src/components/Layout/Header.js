import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

const Header = () => {
  const location = useLocation();

  const headerStyle = {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    color: 'white',
    display:'flex',
    justifyContent:'space-between',
    alignItems:'center'
  };

  const breadcrumbStyle = {
    fontSize: '0.9rem',
    color: '#bdc3c7'
  };

  const linkStyle = {
    color: '#3498db',
    textDecoration: 'none'
  };

  return (
    <header style={headerStyle}>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>
          <img src={logo} width="40px" height="40px"/>IITM Optum Annotator
        </Link>
        <div style={breadcrumbStyle}>
          {location.pathname === '/' ? (
            'Discharge Summaries'
          ) : (
            <>
              <Link to="/" style={linkStyle}>Discharge Summaries</Link> / Summary Viewer
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
