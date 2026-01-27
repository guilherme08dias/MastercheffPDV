
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eilmnydyrvxtcwhsttqv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_amD8_zj0xK9TQYkKHf88cA_7Zx9ymHe';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function runTests() {
    console.log("--- SECURITY CHECK START ---");

    // TEST 1: ORDERS INSERT (Public - Should SUCCEED)
    const { data: order, error: insertError } = await supabase.from('orders').insert({
        customer_name: 'Security Check Final',
        type: 'takeaway',
        total: 1,
        status: 'pending',
        origin: 'web',
        daily_number: 9999
    }).select().single();

    if (insertError) {
        console.log(`ORDERS_INSERT: FAIL [${insertError.code || 'NO_CODE'}] ${insertError.message}`);
    } else {
        console.log(`ORDERS_INSERT: PASS (ID: ${order.id})`);
    }

    // TEST 2: SHIFTS SELECT (Public - Should be BLOCKED/EMPTY)
    const { data: shifts, error: shiftsError } = await supabase.from('shifts').select('*').limit(1);

    // An RLS block often returns an empty array OR an error depending on configuration (usually empty array for select)
    // But if we deleted "shifts_select_anyone", it should return empty (since no policy allows anon select)
    const shiftsLeaked = shifts && shifts.length > 0;

    if (shiftsLeaked) {
        console.log(`SHIFTS_READ_ANON: FAIL (DATA LEAKED: ID ${shifts[0].id})`);
    } else {
        // It's a pass if we got an error OR valid empty data
        const reason = shiftsError ? `Error: ${shiftsError.message}` : "Empty Data (Correct)";
        console.log(`SHIFTS_READ_ANON: PASS (${reason})`);
    }

    // TEST 3: ORDERS DELETE (Public - Should be BLOCKED)
    if (order?.id) {
        const { count, error: deleteError } = await supabase.from('orders').delete().eq('id', order.id).select('id', { count: 'exact' });

        // Count should be 0 if RLS blocked it (but allowed the "attempt"), OR we get an error if policy denies DELETE entirely using USING(false) equivalent logic without matched policy.
        // Actually, if no policy matches for DELETE, it defaults to deny.

        const deleteSucceeded = count && count > 0;

        if (deleteSucceeded) {
            console.log(`ORDERS_DELETE_ANON: FAIL (Deleted ${count} rows)`);
        } else {
            const reason = deleteError ? `Error: ${deleteError.message}` : "Count 0 (Correct)";
            console.log(`ORDERS_DELETE_ANON: PASS (${reason})`);
        }
    } else {
        console.log("ORDERS_DELETE_ANON: SKIP (Insert failed)");
    }

    console.log("--- SECURITY CHECK END ---");
}

runTests();
