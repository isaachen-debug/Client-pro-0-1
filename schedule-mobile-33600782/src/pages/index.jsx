import Layout from "./Layout.jsx";

import Clientes from "./Clientes";

import Financeiro from "./Financeiro";

import Perfil from "./Perfil";

import Schedule from "./Schedule";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Clientes: Clientes,
    
    Financeiro: Financeiro,
    
    Perfil: Perfil,
    
    Schedule: Schedule,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Clientes />} />
                
                
                <Route path="/Clientes" element={<Clientes />} />
                
                <Route path="/Financeiro" element={<Financeiro />} />
                
                <Route path="/Perfil" element={<Perfil />} />
                
                <Route path="/Schedule" element={<Schedule />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}