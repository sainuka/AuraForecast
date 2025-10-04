import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthMetrics {
  date: string;
  hrvScore?: number;
  sleepScore?: number;
  glucoseLevel?: number;
  steps?: number;
  calories?: number;
  restingHeartRate?: number;
}

interface ForecastRequest {
  userId: string;
  metrics: HealthMetrics[];
  cyclePhase?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const requestData: ForecastRequest = await req.json()

    if (requestData.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    if (!requestData.metrics || requestData.metrics.length === 0) {
      return new Response(JSON.stringify({ error: 'No metrics provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = buildForecastPrompt(requestData.metrics, requestData.cyclePhase)

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a women\'s health AI assistant specializing in analyzing biometric data to provide personalized wellness forecasts. Focus on patterns in HRV, sleep, glucose, and activity metrics. Consider menstrual cycle impacts on health metrics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const openAIData = await openAIResponse.json()
    const forecastText = openAIData.choices[0]?.message?.content

    if (!forecastText) {
      throw new Error('No forecast generated')
    }

    const lines = forecastText.split('\n').filter((line: string) => line.trim())
    const recommendations: string[] = []
    let mainForecast = forecastText

    lines.forEach((line: string) => {
      if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
        recommendations.push(line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      }
    })

    return new Response(
      JSON.stringify({ 
        forecast: mainForecast,
        recommendations: recommendations.length > 0 ? recommendations : null,
        insights: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function buildForecastPrompt(metrics: HealthMetrics[], cyclePhase?: string): string {
  let prompt = 'Analyze the following health metrics and provide a personalized wellness forecast:\n\n'
  
  prompt += 'Recent Metrics:\n'
  metrics.forEach((metric, index) => {
    prompt += `Day ${index + 1} (${metric.date}):\n`
    if (metric.hrvScore) prompt += `  - HRV Score: ${metric.hrvScore}\n`
    if (metric.sleepScore) prompt += `  - Sleep Score: ${metric.sleepScore}\n`
    if (metric.glucoseLevel) prompt += `  - Glucose Level: ${metric.glucoseLevel} mg/dL\n`
    if (metric.steps) prompt += `  - Steps: ${metric.steps}\n`
    if (metric.calories) prompt += `  - Calories Burned: ${metric.calories}\n`
    if (metric.restingHeartRate) prompt += `  - Resting Heart Rate: ${metric.restingHeartRate} bpm\n`
    prompt += '\n'
  })

  if (cyclePhase) {
    prompt += `Current Menstrual Cycle Phase: ${cyclePhase}\n\n`
  }

  prompt += 'Please provide:\n'
  prompt += '1. Overall health trend assessment\n'
  prompt += '2. Key patterns or anomalies detected\n'
  prompt += '3. Personalized recommendations for the next 3-7 days\n'
  prompt += '4. Specific advice related to current cycle phase (if applicable)\n'
  prompt += '5. Areas to monitor closely\n'
  
  return prompt
}
