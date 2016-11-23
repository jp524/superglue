module Bath
  module SearchExtension
    def found!
      found = @found
      @found = nil
      @search_path = []
      found
    end

    def array!(collection = [], *attributes)
      original_search_path = @search_path
      super
    ensure
      @search_path = original_search_path
    end

    def _filter_by_path(search_path)
      if search_path.is_a? ::String
        return _filter_by_path(search_path.split('.'))
      end
      @search_path = search_path
    end

    def _prepare_collection_for_map(collection)
      if @search_path && !@search_path.empty?
        id_name, id_val = @search_path.first.split('=')
        id_val = id_val.to_i

        if (defined? ::ActiveRecord) && collection.is_a?(::ActiveRecord::Relation)
          @search_path = @search_path[1..-1]
          collection = collection.where(::Hash[id_name, id_val])
        else
          found = collection.find do |ele|
            ele[id_name] == id_val || ele[id_name.to_sym] == id_val
          end

          collection = [found]
        end
      else
        super
      end
    end

    def set!(key, value = BLANK, *args)
      options = args.first || {}
      options = _normalize_options(options)

      if ::Kernel.block_given? && @search_path && !@search_path.empty?
        if key.to_s == @search_path.first
          original_search_path = @search_path
          @search_path = original_search_path[1..-1]
          if @search_path.size == 0
            @found = if _cache_options?(options)
              _cache(*options[:cache]) { _scope { yield self } }
            else
              _scope { yield self }
            end
          else
            yield self
          end

          @search_path = original_search_path
        end

        return _blank
      else
        super
      end
    end
  end
end
