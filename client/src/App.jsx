import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Host from './Host';
import Contestant from './Contestant';
import './index.css';

function Home() {
  return (
    <div className="home-menu">
      <h1>Quiz Master</h1>
      <div className="links">
        <Link to="/host" className="btn">Host Dashboard</Link>
        <Link to="/contestant" className="btn">Contestant View</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/contestant" element={<Contestant />} />
      </Routes>
    </Router>
  );
}

export default App;
