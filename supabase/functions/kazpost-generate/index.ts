import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@5.0.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KAZPOST_SOAP_URL = 'http://rates.kazpost.kz/postratesws/postratesws.wsdl';

interface OrderPii {
  name: string;
  phone: string;
  address: string;
}

function buildGetParcelBarcodeEnvelope(
  apiKey: string,
  params: {
    rcpnName: string; rcpnPhone: string; rcpnIndex: string;
    rcpnCity: string; rcpnStreet: string; rcpnHouse: string;
    sndrBin: string; sndrName: string; sndrPhone: string;
    sndrIndex: string; sndrCity: string; sndrStreet: string; sndrHouse: string;
    weight: string; declaredValue: string; cashOnDelivery: string;
    productCode: string; sendMethod: string; mailCtg: string;
    orderNum: string; deaNumber: string; deaDepCode: string;
  },
): string {
  const marks = params.deaNumber ? `<pos:Marks><pos:Mark>returnAfter</pos:Mark></pos:Marks>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pos="http://webservices.kazpost.kz/postratesws">
  <soapenv:Header/>
  <soapenv:Body>
    <pos:GetParcelBarcodeRequest>
      <pos:Key>${apiKey}</pos:Key>
      <pos:AddrInfo>
        <pos:RcpnName>${params.rcpnName}</pos:RcpnName>
        <pos:RcpnPhone>${params.rcpnPhone}</pos:RcpnPhone>
        <pos:RcpnIndex>${params.rcpnIndex}</pos:RcpnIndex>
        <pos:RcpnCity>${params.rcpnCity}</pos:RcpnCity>
        <pos:RcpnStreet>${params.rcpnStreet}</pos:RcpnStreet>
        <pos:RcpnHouse>${params.rcpnHouse}</pos:RcpnHouse>
        <pos:SndrBIN>${params.sndrBin}</pos:SndrBIN>
        <pos:SndrName>${params.sndrName}</pos:SndrName>
        <pos:SndrPhone>${params.sndrPhone}</pos:SndrPhone>
        <pos:SndrIndex>${params.sndrIndex}</pos:SndrIndex>
        <pos:SndrCity>${params.sndrCity}</pos:SndrCity>
        <pos:SndrStreet>${params.sndrStreet}</pos:SndrStreet>
        <pos:SndrHouse>${params.sndrHouse}</pos:SndrHouse>
        <pos:Weight>${params.weight}</pos:Weight>
        <pos:DeclaredValue>${params.declaredValue}</pos:DeclaredValue>
        <pos:CashOnDelivery>${params.cashOnDelivery}</pos:CashOnDelivery>
        <pos:ProductCode>${params.productCode}</pos:ProductCode>
        ${marks}
        <pos:SendMethod>${params.sendMethod}</pos:SendMethod>
        <pos:MailCtg>${params.mailCtg}</pos:MailCtg>
        <pos:OrderNum>${params.orderNum}</pos:OrderNum>
        <pos:MailCount>1</pos:MailCount>
        ${params.deaNumber ? `<pos:DEA_NUMBER>${params.deaNumber}</pos:DEA_NUMBER>` : ''}
        ${params.deaDepCode ? `<pos:DEA_DEPCODE>${params.deaDepCode}</pos:DEA_DEPCODE>` : ''}
      </pos:AddrInfo>
    </pos:GetParcelBarcodeRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/** Parse free-text address into index, city, street, house */
function parseAddress(raw: string, defaultIndex: string): { city: string; street: string; house: string; index: string } {
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  // Expected format: "Index, City, Street, House" or just free text
  let index = defaultIndex;
  let city = parts.length > 1 ? parts[parts.length - 3] : '';
  let street = parts.length > 0 ? parts[parts.length - 2] || '' : '';
  let house = parts.length > 0 ? parts[parts.length - 1] || '' : '';

  // Try to extract index (6 digits)
  for (const p of parts) {
    const match = p.match(/^(\d{6})$/);
    if (match) { index = match[1]; break; }
  }

  return { city, street, house, index };
}

/** Get order PII from Hoster.kz bridge */
async function getOrderPii(bridgeUrl: string, bridgeKey: string, orderId: string): Promise<OrderPii | null> {
  try {
    const res = await fetch(`${bridgeUrl}/order-pii/${encodeURIComponent(orderId)}`, {
      headers: { 'x-bridge-key': bridgeKey },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, store_id, total_price, public_order_id, kazpost_barcode, customer_phone, order_items(product_name, quantity, product_price)')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (order.kazpost_barcode) {
      return new Response(
        JSON.stringify({ barcode: order.kazpost_barcode, message: 'Barcode already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Get store config
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, whatsapp_phone, kazpost_dea_number, kazpost_dea_depcode, kazpost_sender_bin, kazpost_sender_index, kazpost_sender_city, kazpost_sender_street, kazpost_sender_house, kazpost_default_product, kazpost_default_send_method, kazpost_default_mail_ctg')
      .eq('id', order.store_id)
      .single();

    if (storeErr || !store) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Get KazPost API key
    const { data: keyData, error: keyErr } = await supabase
      .from('store_kazpost_keys')
      .select('api_key')
      .eq('store_id', order.store_id)
      .single();

    if (keyErr || !keyData) {
      return new Response(
        JSON.stringify({ error: 'KazPost API key not configured. Set it in store settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Get recipient PII from bridge
    const bridgeUrl = Deno.env.get('KZ_BRIDGE_URL');
    const bridgeKey = Deno.env.get('KZ_BRIDGE_KEY');
    let pii: OrderPii | null = null;
    if (bridgeUrl && bridgeKey) {
      pii = await getOrderPii(bridgeUrl, bridgeKey, orderId);
    }

    // 5. Build recipient data
    const recipientParts = (pii?.address || '').split('\n').map(s => s.trim()).filter(Boolean);
    const recipientCity = pii?.address ? recipientParts[0] || '' : '';
    const recipientStreet = pii?.address ? recipientParts[1] || '' : '';
    const recipientHouse = pii?.address ? recipientParts[2] || '' : '';

    const totalWeight = (order.order_items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    // 6. Build SOAP and call KazPost
    const soapBody = buildGetParcelBarcodeEnvelope(keyData.api_key, {
      rcpnName: pii?.name || 'Customer',
      rcpnPhone: order.customer_phone.replace(/[^0-9]/g, '').replace(/^8/, '7'),
      rcpnIndex: '',
      rcpnCity: recipientCity,
      rcpnStreet: recipientStreet,
      rcpnHouse: recipientHouse,
      sndrBin: store.kazpost_sender_bin || '000000000000',
      sndrName: store.name,
      sndrPhone: (store.whatsapp_phone || order.customer_phone).replace(/[^0-9]/g, '').replace(/^8/, '7'),
      sndrIndex: store.kazpost_sender_index || '',
      sndrCity: store.kazpost_sender_city || '',
      sndrStreet: store.kazpost_sender_street || '',
      sndrHouse: store.kazpost_sender_house || '',
      weight: String(Math.max(totalWeight, 1)),
      declaredValue: String(order.total_price),
      cashOnDelivery: String(order.total_price),
      productCode: store.kazpost_default_product,
      sendMethod: store.kazpost_default_send_method,
      mailCtg: store.kazpost_default_mail_ctg,
      orderNum: order.public_order_id || order.id.slice(0, 8),
      deaNumber: store.kazpost_dea_number || '',
      deaDepCode: store.kazpost_dea_depcode || '',
    });

    const response = await fetch(KAZPOST_SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'GetParcelBarcode',
      },
      body: soapBody,
    });

    const xmlText = await response.text();

    if (xmlText.includes('SOAP-ENV:Fault') || xmlText.includes('soap:Fault')) {
      return new Response(
        JSON.stringify({ error: 'KazPost service error', detail: xmlText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xmlText);
    const resp = parsed?.['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['ns2:GetParcelBarcodeResponse'] || {};
    const info = resp['ns2:ResponseInfo'] || {};

    const code = info['ns2:ResponseCode'];
    if (code !== '0' && code !== 0) {
      return new Response(
        JSON.stringify({ error: info['ns2:ResponseText'] || 'KazPost error', code }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const barcode = resp['ns2:Barcode'] || '';

    // 7. Save barcode to order
    if (barcode) {
      await supabase.from('orders').update({ kazpost_barcode: barcode }).eq('id', orderId);
    }

    return new Response(
      JSON.stringify({ barcode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
