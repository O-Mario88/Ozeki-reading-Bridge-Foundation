from django.contrib import admin

from .models import District, Parish, Region, SubCounty, SubRegion

admin.site.register(Region)
admin.site.register(SubRegion)
admin.site.register(District)
admin.site.register(SubCounty)
admin.site.register(Parish)
