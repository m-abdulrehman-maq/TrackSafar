import { useNavigate } from "react-router-dom";
export function useForbiddenPageController() {
  const navigate = useNavigate();
  return {
    navigate,
  };
}
export function useNotFoundPageController() {
  const navigate = useNavigate();
  return {
    navigate,
  };
}
