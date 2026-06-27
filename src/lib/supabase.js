import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://knbqjcuhcwtcjqjxxnxm.supabase.co'
const supabaseKey = 'sb_publishable_OgkOaOW2L_Y0Gr_ai_--DQ_UPNvV5UC'

export const supabase = createClient(supabaseUrl, supabaseKey)
