import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // 必须使用 Service Role 权限删除文件
    )

    // Webhook 载荷：获取被删除的行数据
    const payload = await req.json()
    const imageUrl = payload.record?.image_url || payload.old_record?.image_url

    if (!imageUrl) {
      return new Response(JSON.stringify({ message: 'No image URL found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 解析路径：从 URL 中提取 "products/filename.webp"
    // 假设 URL 格式为: .../storage/v1/object/public/product-images/folder/img.jpg
    const pathParts = imageUrl.split('/product-images/')
    if (pathParts.length < 2) {
      throw new Error('Invalid image URL format')
    }
    const filePath = pathParts[1]

    // 执行物理删除
    const { data, error } = await supabaseClient
      .storage
      .from('product-images')
      .remove([filePath])

    if (error) throw error

    return new Response(JSON.stringify({ message: `Deleted: ${filePath}`, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})