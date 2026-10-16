import { useAuth } from '../context/useAuth.js';
import Info from "../components/Info"
import Gallery from "../components/Gallery"

export default function Home() {
  const { isLoggedIn } = useAuth();

  return (
    <>
      <Info />
      <Gallery isLoggedIn={isLoggedIn} />
      <div data-testid="promptforge-home" hidden></div>
    </>
  )
}