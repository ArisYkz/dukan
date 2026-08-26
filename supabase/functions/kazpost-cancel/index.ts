import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@5.0.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KAZPOST_SOAP_URL = 'http://rates.kazpost.kz/postratesws/postratesws.wsdl';

/** Build the base64-encoded barcode XML array that KazPost expects */
function buildBarcodeXml(barcode: string): string {
  const xml = `<MAILS><MAIL><BARCODE>${barcode}</BARCODE></MAIL></MAILS>`;
  return btoa(xml);
}

function buildPunDoInsertEnvelope(apiKey: string, barcode: string, orderNum: string): string {
  const barcodeBase64 = buildBarcodeXml(barcode);
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Header/>
  <SOAP-ENV:Body>
    <ns2:PunDoInsertRequest xmlns:ns2="http://webservices.kazpost.kz/postratesws">
      <ns2:barCode>${barcodeBase64}</ns2:barCode>
      <ns2:ordernum>${orderNum}</ns2:ordernum>
      <ns2:key>${apiKey}</ns2:key>
    </ns2:PunDoInsertRequest>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
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

    // 1. Get order with barcode
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, store_id, kazpost_barcode, public_order_id, reference_code')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!order.kazpost_barcode) {
      return new Response(
        JSON.stringify({ error: 'No KazPost barcode to cancel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Get store API key
    const { data: keyData, error: keyErr } = await supabase
      .from('store_kazpost_keys')
      .select('api_key')
      .eq('store_id', order.store_id)
      .single();

    if (keyErr || !keyData) {
      return new Response(
        JSON.stringify({ error: 'KazPost API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Build SOAP and call KazPost
    const soapBody = buildPunDoInsertEnvelope(
      keyData.api_key,
      order.kazpost_barcode,
      order.public_order_id || order.reference_code || order.id.slice(0, 8),
    );

    const response = await fetch(KAZPOST_SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'punDoInsert',
      },
      body: soapBody,
    });

    const xmlText = await response.text();

    // 4. Parse response
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xmlText);
    const resp = parsed?.['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['ns2:PunDoInsertResponse'] || {};
    const info = resp['ns2:ResponseInfo'] || {};
    const code = info['ns2:ResponseCode'];
    const text = info['ns2:ResponseText'] || '';

    if (code === '0' || code === 0) {
      // Clear the barcode from the order since it's been canceled
      await supabase.from('orders').update({ kazpost_barcode: null }).eq('id', orderId);

      return new Response(
        JSON.stringify({ success: true, message: 'Barcode cancelled successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: text || 'KazPost cancel failed', code }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
