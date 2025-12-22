const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUsers() {
    console.log('--- Auth Users ---')
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) console.error(authError)
    else console.log(`Total Auth Users: ${users.length}`)
    users.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`))

    console.log('\n--- Profiles Table ---')
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*')
    if (profileError) console.error(profileError)
    else console.log(`Total Profiles: ${profiles.length}`)
    profiles.forEach(p => console.log(`- ${p.nombre} ${p.apellidos} (ID: ${p.id})`))
}

checkUsers()
