import styled from "styled-components";

const StyledButton = styled.button`
  background-color: rgb(9, 88, 199); /* Equivalent to bg-gray-800 */
  color: white;
  border-radius: 9999px; /* Equivalent to rounded-full */
  padding: 16px; /* Equivalent to p-4 */
  display: flex;
  align-items: center;
  gap: 4px; /* Equivalent to gap-1 */
  transition: opacity 0.3s;
  z-index: 100000; /* Always on top */

  &:hover {
    opacity: 0.9;
  }
`;

export default function Button({ icon, children, onClick, className }) {
  return (
    <StyledButton className={className} onClick={onClick}>
      {icon}
      {children}
    </StyledButton>
  );
}
