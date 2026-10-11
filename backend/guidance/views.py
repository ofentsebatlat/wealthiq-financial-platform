from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .engine import generate_guidance


@login_required
def guidance_view(request):
    tips = generate_guidance(request.user)
    return render(request, 'guidance/tips.html', {'tips': tips})


@login_required
def api_guidance(request):
    tips = generate_guidance(request.user)
    return JsonResponse({'tips': tips})
