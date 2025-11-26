import { useNavigate } from 'react-router-dom';
import LoginScreen from '../components/LoginScreen';

export default function Login() {
  const navigate = useNavigate();

  const handleNavigate = (screen: string) => {
    if (screen === 'main-map') {
      navigate('/map');
    } else {
      navigate('/');
    }
  };

  return <LoginScreen onNavigate={handleNavigate} />;
}

