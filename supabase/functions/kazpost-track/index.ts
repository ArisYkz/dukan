import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@5.0.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KAZPOST_SOAP_URL = 'http://rates.kazpost.kz/postratesws/postratesws.wsdl';

const SOAP_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pos="http://webservices.kazpost.kz/postratesws">
  <soapenv:Header/>
  <soapenv:Body>
    <pos:GetBarcodeInfoRequest>
      <pos:Barcode>{{BARCODE}}</pos:Barcode>
    </pos:GetBarcodeInfoRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

function buildSoapEnvelope(barcode: string): string {
  return SOAP_TEMPLATE.replace('{{BARCODE}}', barcode);
}

interface TrackingResult {
  status: string | null;
  productCode: string | null;
  weight: string | null;
  declaredValue: string | null;
  cashOnDelivery: string | null;
  deliverySum: string | null;
  recipientCity: string | null;
  recipientIndex: string | null;
  sendMethod: string | null;
  mailCtg: string | null;
  responseCode: string | null;
  responseText: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json();

    if (!barcode || typeof barcode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const soapBody = buildSoapEnvelope(barcode.trim());

    const response = await fetch(KAZPOST_SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'GetBarcodeInfo',
      },
      body: soapBody,
    });

    const xmlText = await response.text();

    // Fast SOAP response check
    if (xmlText.includes('SOAP-ENV:Fault') || xmlText.includes('soap:Fault')) {
      return new Response(
        JSON.stringify({ error: 'KazPost service error', detail: xmlText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xmlText);

    const responseBody =
      parsed?.['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['ns2:GetBarcodeInfoResponse'] || {};

    const info = responseBody['ns2:ResponseInfo'] || {};
    const result: TrackingResult = {
      status: responseBody['ns2:Status'] || null,
      productCode: responseBody['ns2:ProductCode'] || null,
      weight: responseBody['ns2:Weight'] || null,
      declaredValue: responseBody['ns2:DeclaredValue'] || null,
      cashOnDelivery: responseBody['ns2:CashOnDelivery'] || null,
      deliverySum: responseBody['ns2:DeliverySum'] || null,
      recipientCity: responseBody['ns2:RcpnCity'] || null,
      recipientIndex: responseBody['ns2:RcpnIndex'] || null,
      sendMethod: responseBody['ns2:SendMethod'] || null,
      mailCtg: responseBody['ns2:MailCtg'] || null,
      responseCode: info['ns2:ResponseCode'] || null,
      responseText: info['ns2:ResponseText'] || null,
    };

    // Log tracking lookup for analytics
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: logError } = await supabase
        .from('orders')
        .select('id')
        .eq('kazpost_barcode', barcode.trim())
        .single();

      // Silent — just for observability
    } catch {
      // ignore logging failures
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
