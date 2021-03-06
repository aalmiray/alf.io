/**
 * This file is part of alf.io.
 *
 * alf.io is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * alf.io is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with alf.io.  If not, see <http://www.gnu.org/licenses/>.
 */
package alfio.util;

import alfio.config.Initializer;
import alfio.config.WebSecurityConfig;
import com.samskivert.mustache.Mustache;
import com.samskivert.mustache.Mustache.Compiler;
import com.samskivert.mustache.Template;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.core.env.Environment;
import org.springframework.core.io.AbstractFileResolvingResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.context.support.ServletContextResource;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.i18n.MustacheLocalizationMessageInterceptor;
import org.springframework.web.servlet.support.RequestContextUtils;
import org.springframework.web.servlet.view.mustache.jmustache.JMustacheTemplateLoader;

import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * For hiding the uglyness :)
 * */
public class TemplateManager {

	private final MessageSource messageSource;
	private final boolean cache;
	private Map<String, Template> templateCache = new ConcurrentHashMap<>(5); // 1 pdf, 2 email confirmation, 2 email
																				// ticket

	private final Compiler templateCompiler;

	@Autowired
	public TemplateManager(Environment environment,
						   JMustacheTemplateLoader templateLoader,
						   MessageSource messageSource) {
		this.messageSource = messageSource;
		this.cache = environment.acceptsProfiles(Initializer.PROFILE_LIVE);
		this.templateCompiler = Mustache.compiler()
				.escapeHTML(false)
				.standardsMode(false)
				.defaultValue("")
				.nullValue("")
				.withFormatter(
						(o) -> {
							return (o instanceof ZonedDateTime) ? DateTimeFormatter.ISO_ZONED_DATE_TIME
									.format((ZonedDateTime) o) : String.valueOf(o);
						})
				.withLoader(templateLoader);
	}

	public String renderClassPathResource(String classPathResource, Map<String, Object> model, Locale locale) {
		return render(new ClassPathResource(classPathResource), classPathResource, model, locale);
	}

	public String renderServletContextResource(String servletContextResource, Map<String, Object> model, HttpServletRequest request) {
		model.put("request", request);
		model.put(WebSecurityConfig.CSRF_PARAM_NAME, request.getAttribute(CsrfToken.class.getName()));
		return render(new ServletContextResource(request.getServletContext(), servletContextResource), servletContextResource, model, RequestContextUtils.getLocale(request));
	}

	private String render(AbstractFileResolvingResource resource, String key, Map<String, Object> model, Locale locale) {
		try {
			ModelAndView mv = new ModelAndView((String) null, model);
			mv.addObject("format-date", MustacheCustomTagInterceptor.FORMAT_DATE);
			mv.addObject(MustacheLocalizationMessageInterceptor.DEFAULT_MODEL_KEY, new CustomLocalizationMessageInterceptor(locale, messageSource).createTranslator());
			Template tmpl = cache ? templateCache.computeIfAbsent(key, k -> compile(resource))
					: compile(resource);
			return tmpl.execute(mv.getModel());
		} catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}

	private Template compile(AbstractFileResolvingResource resource) {
		try {
			InputStreamReader tmpl = new InputStreamReader(resource.getInputStream(),
					StandardCharsets.UTF_8);
			return templateCompiler.compile(tmpl);
		} catch (IOException ioe) {
			throw new IllegalStateException(ioe);
		}
	}

	private static class CustomLocalizationMessageInterceptor {

		private static final Pattern KEY_PATTERN = Pattern.compile("(.*?)[\\s\\[]");
		private static final Pattern ARGS_PATTERN = Pattern.compile("\\[(.*?)\\]");
		private final Locale locale;
		private final MessageSource messageSource;

		private CustomLocalizationMessageInterceptor(Locale locale, MessageSource messageSource) {
			this.locale = locale;
			this.messageSource = messageSource;
		}

		protected Mustache.Lambda createTranslator() {
			return (frag, out) -> {
				String template = frag.execute();
				final String key = extractKey(template);
				final List<String> args = extractParameters(template);
				final String text = messageSource.getMessage(key, args.toArray(), locale);
				out.write(text);
			};
		}

		/**
		 * Split key from (optional) arguments.
		 *
		 * @param key
		 * @return localization key
		 */
		private String extractKey(String key) {
			Matcher matcher = KEY_PATTERN.matcher(key);
			if (matcher.find()) {
				return matcher.group(1);
			}

			return key;
		}

		/**
		 * Split args from input string.
		 * <p/>
		 * localization_key [param1] [param2] [param3]
		 *
		 * @param key
		 * @return List of extracted parameters
		 */
		private List<String> extractParameters(String key) {
			final Matcher matcher = ARGS_PATTERN.matcher(key);
			final List<String> args = new ArrayList<>();
			while (matcher.find()) {
				args.add(matcher.group(1));
			}
			return args;
		}
	}
}
