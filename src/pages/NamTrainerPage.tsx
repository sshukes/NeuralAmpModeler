import React from 'react';
import { Link } from 'react-router-dom';
// Adjust this path/name to match your actual file exactly:
import  {NamTrainerApp} from '../components/NamTrainerApp';

const NamTrainerPage: React.FC = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
        <Link to="/runs">View training runs</Link>
        {' | '}
        <Link to="/theme-test">Theme preview</Link>
      </div>
      <NamTrainerApp />
    </div>
  );
};

export default NamTrainerPage;
