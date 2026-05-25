import { motion } from "framer-motion";

export default function PageTransition({ children }) {
  return (
    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}