
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eilmnydyrvxtcwhsttqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbG1ueWR5cnZ4dGN3aHN0dHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4Mzc3NTgsImV4cCI6MjA4MTQxMzc1OH0.MUn-LoPvR2BZ_9mwL21koTnc2KcQlj_ccW3bgBhWciE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLatestOrder() {
  console.log('Checking latest order...');
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching order:', error);
    return;
  }

  if (data && data.length > 0) {
    const order = data[0];
    console.log('Latest Order:', {
      id: order.id,
      daily_number: order.daily_number,
      customer_name: order.customer_name,
      created_at: order.created_at,
      printed: order.printed,
      total: order.total
    });
  } else {
    console.log('No orders found.');
  }
}

checkLatestOrder();
