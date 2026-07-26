import { motion } from 'framer-motion'
import TravelChat from '../components/TravelChat'
import { EASE } from '../components/Form'

export default function ChatScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-28 safe-t"
    >
      <header className="pt-3 pb-5 text-center">
        <h1 className="foil font-display text-3xl leading-none">Travel Chat</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
      </header>

      <TravelChat scope="general" />
    </motion.div>
  )
}
