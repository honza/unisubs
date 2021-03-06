# Universal Subtitles, universalsubtitles.org
#
# Copyright (C) 2012 Participatory Culture Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see
# http://www.gnu.org/licenses/agpl-3.0.html.

from django import http
from django.conf.urls.defaults import include, patterns, url
from django.conf import settings
from django.contrib import admin
from django.template import RequestContext, loader
from sitemaps import sitemaps, sitemap_view, sitemap_index
from socialauth.models import (AuthMeta, OpenidProfile, TwitterUserProfile,
     FacebookUserProfile)
import sentry_logger

admin.autodiscover()

# these really should be unregistred but while in development the dev server
# might have not registred yet, so we silence this exception
try:
    admin.site.unregister([AuthMeta, OpenidProfile, TwitterUserProfile,
        FacebookUserProfile])
except admin.sites.NotRegistered:
    pass

# Monkeypatch the Celery admin to show a column for task run time in the list view.
from djcelery.admin import TaskMonitor
from djcelery.models import TaskState


admin.site.unregister([TaskState])
TaskMonitor.list_display += ('runtime',)
admin.site.register(TaskState, TaskMonitor)

js_info_dict = {
    'packages': ('unisubs'),
}

urlpatterns = patterns('',
    url(r'^crossdomain.xml$',
        'crossdomain_views.root_crossdomain'),
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict,
        name='js_i18n_catalog'),
    url(r'^$',
        'videos.views.index'),
    url(r'^sentry/',
        include('sentry.web.urls')),
    url(r'^comments/',
        include('comments.urls', namespace='comments')),
    url(r'^messages/',
        include('messages.urls', namespace='messages')),
    url(r'^icanhaz/',
        include('icanhaz.urls', namespace="icanhaz")),
    url(r'^rosetta/',
        include('rosetta.urls')),
    url(r'^pcf-targetter/',
        include('targetter.urls', namespace='targetter')),
    url(r'^logout/',
        'django.contrib.auth.views.logout', name='logout'),
    url(r'^admin/password_reset/$', 'django.contrib.auth.views.password_reset',
        name='password_reset'),
    url(r'^password_reset/done/$',
        'django.contrib.auth.views.password_reset_done'),
    url(r'^reset/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$',
        'django.contrib.auth.views.password_reset_confirm'),
    url(r'^reset/done/$',
        'django.contrib.auth.views.password_reset_complete'),
    url(r'socialauth/',
        include('socialauth.urls')),
    url(r'^admin/settings/',
        include('livesettings.urls')),
    url(r'^admin/',
        include(admin.site.urls)),
    url(r'^embed(?P<version_no>\d+)?.js$', 'widget.views.embed',
        name="widget-embed"),
    url(r'^widget_demo/$',
        'widget.views.widget_demo'),
    url(r'^widget_public_demo/$',
        'widget.views.widget_public_demo'),
    url(r'^onsite_widget/$',
        'widget.views.onsite_widget', name='onsite_widget'),
    url(r'^onsite_widget_resume/$', 'widget.views.onsite_widget_resume',
        name='onsite_widget_resume'),
    url(r'^widget/', include('widget.urls', namespace='widget',
        app_name='widget')),
    url(r'^jstest/(\w+)',
        'jstesting.views.jstest'),
    url(r'^jsdemo/(\w+)',
        'jsdemo.views.jsdemo'),
    url(r'^pagedemo/(\w+)?$',
            'pagedemo.views.pagedemo', name="pagedemo"),
    url(r'statistic/',
        include('statistic.urls', namespace='statistic')),
    url(r'streamer/',
        include('streamer.urls', namespace='streamer')),
    url(r'^search/',
        include('search.urls', 'search')),
    url(r'^counter/$',
        'videos.views.counter', name="counter"),
    url(r'^uslogging/',
        include('uslogging.urls', 'uslogging')),
    url(r'^services/$', 'django.views.generic.simple.direct_to_template',
        {'template': 'services.html'}, 'services_page'),
    url(r'^solutions/ngo/$', 'django.views.generic.simple.direct_to_template',
        {'template': 'solutions/ngo.html'}, 'solutions_page'),
    url(r'^streaming-transcript/$', 'django.views.generic.simple.direct_to_template',
        {'template': 'streaming-transcript.html'}, 'streaming_transcript_demo'),
    url(r'^w3c/p3p.xml$', 'django.views.generic.simple.direct_to_template',
        {'template': 'p3p.xml'}),
    url(r'^w3c/Policies.xml$', 'django.views.generic.simple.direct_to_template',
        {'template': 'Policies.xml'}, 'policy_page'),
    url(r'^demo/$',
        'videos.views.demo', name="demo"),
    url(r'^about$',  'django.views.generic.simple.direct_to_template',
        {'template': 'about.html'}, 'about_page'),
    url(r'^get-code/$',  'django.views.generic.simple.direct_to_template',
        {'template': 'embed_page.html'}, 'get_code_page'),
    url(r'^dmca$',  'django.views.generic.simple.direct_to_template',
        {'template': 'dmca.html'}, 'dmca_page'),
    url(r'^faq$',  'django.views.generic.simple.direct_to_template',
        {'template': 'faq.html'}, 'faq_page'),
    url(r'^terms$',  'django.views.generic.simple.direct_to_template',
        {'template': 'terms.html'}, 'terms_page'),
    url(r'^opensubtitles2010$',  'django.views.generic.simple.direct_to_template',
        {'template': 'opensubtitles2010.html'}, 'opensubtitles2010_page'),
    url(r'^revision$',  'django.views.generic.simple.direct_to_template',
        {'template': 'revision.html'}),
    url(r'^revision2$',  'django.views.generic.simple.direct_to_template',
        {'template': 'revision2.html'}),
    url(r'^revision-history$',  'django.views.generic.simple.direct_to_template',
        {'template': 'revision-history.html'}),
    url(r'^test-ogg$',  'django.views.generic.simple.direct_to_template',
        {'template': 'alpha-test01-ogg.htm'}, 'test-ogg-page'),
    url(r'^test-mp4$',  'django.views.generic.simple.direct_to_template',
        {'template': 'alpha-test01-mp4.htm'}, 'test-mp4-page'),
    url(r'^sitemap\.xml$', sitemap_index, {'sitemaps': sitemaps},
        name="sitemap-index"),
    url(r'^sitemap-(?P<section>.+)\.xml$', sitemap_view, {'sitemaps': sitemaps},
        name="sitemap"),
    url(r"helpers/",
        include('testhelpers.urls', namespace='helpers')),
    url(r"^accountlinker/", include('accountlinker.urls',
        namespace="accountlinker")),
    url(r'^videos/', include('videos.urls', namespace='videos',
        app_name='videos')), url(r'^teams/', include('teams.urls',
        namespace='teams', app_name='teams')),
    url(r'^profiles/', include('profiles.urls', namespace='profiles',
        app_name='profiles')), url(r'auth/', include('auth.urls',
        namespace='auth', app_name='auth')),
)

try:
    from services import urls
    urlpatterns += patterns('',
        (r'^unisubservices/', include('services.urls', namespace='services')),
    )
except ImportError:
    pass

try:
    from servicesauth import urls
    urlpatterns += patterns('', (r'^unisubservicesauth/',
        include('servicesauth.urls', namespace='servicesauth')),)
except ImportError:
    pass

try:
    from api import urls
    urlpatterns += patterns('', url(r'^api/', include('api.urls', 'api')),)
except ImportError:
    pass

try:
    from apiv2 import urls as api2urls
    urlpatterns += patterns('', url(r'^api2/', include('apiv2.urls',
        namespace=api2urls.URL_NAMESPACE),),)
except ImportError:
    pass

if settings.DEBUG:
    urlpatterns += patterns('',
        (r'^site_media/(?P<path>.*)$', 'django.views.static.serve',
         {'document_root': settings.STATIC_ROOT, 'show_indexes': True}),
        (r'^user-data/(?P<path>.*)$', 'django.views.static.serve',
         {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
        (r'raw_template/(?P<template>.*)',
            'django.views.generic.simple.direct_to_template'),
    )

def handler500(request, template_name='500.html'):
    t = loader.get_template(template_name)
    return http.HttpResponseServerError(t.render(RequestContext(request)))
