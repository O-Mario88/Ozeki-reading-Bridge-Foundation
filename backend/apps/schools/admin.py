from django.contrib import admin

from .models import School, SchoolContact, SchoolGraduationWorkflow, Teacher

admin.site.register(School)
admin.site.register(SchoolContact)
admin.site.register(Teacher)
admin.site.register(SchoolGraduationWorkflow)
