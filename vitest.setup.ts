import { config } from 'dotenv'
import path from 'path'
import '@testing-library/jest-dom/vitest'

config({ path: path.resolve(process.cwd(), '.env.local'), debug: false })
